/* -*- Mode: Java; c-basic-offset: 4; tab-width: 4; indent-tabs-mode: nil; -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko;

import org.mozilla.gecko.annotation.RobocopTarget;
import org.mozilla.gecko.annotation.WrapForJNI;
import org.mozilla.gecko.mozglue.GeckoLoader;
import org.mozilla.gecko.process.GeckoProcessManager;
import org.mozilla.gecko.util.GeckoBundle;
import org.mozilla.gecko.util.FileUtils;
import org.mozilla.gecko.util.ThreadUtils;

import android.content.Context;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.MessageQueue;
import android.os.SystemClock;
import android.text.TextUtils;
import android.util.Log;

import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Locale;
import java.util.StringTokenizer;

public class GeckoThread extends Thread {
    private static final String LOGTAG = "GeckoThread";

    public enum State implements NativeQueue.State {
        // After being loaded by class loader.
        @WrapForJNI INITIAL(0),
        // After launching Gecko thread
        @WrapForJNI LAUNCHED(1),
        // After loading the mozglue library.
        @WrapForJNI MOZGLUE_READY(2),
        // After loading the libxul library.
        @WrapForJNI LIBS_READY(3),
        // After initializing nsAppShell and JNI calls.
        @WrapForJNI JNI_READY(4),
        // After initializing profile and prefs.
        @WrapForJNI PROFILE_READY(5),
        // After initializing frontend JS
        @WrapForJNI RUNNING(6),
        // After granting request to shutdown
        @WrapForJNI EXITING(3),
        // After granting request to restart
        @WrapForJNI RESTARTING(3),
        // After failed lib extraction due to corrupted APK
        CORRUPT_APK(2),
        // After exiting GeckoThread (corresponding to "Gecko:Exited" event)
        @WrapForJNI EXITED(0);

        /* The rank is an arbitrary value reflecting the amount of components or features
         * that are available for use. During startup and up to the RUNNING state, the
         * rank value increases because more components are initialized and available for
         * use. During shutdown and up to the EXITED state, the rank value decreases as
         * components are shut down and become unavailable. EXITING has the same rank as
         * LIBS_READY because both states have a similar amount of components available.
         */
        private final int rank;

        private State(int rank) {
            this.rank = rank;
        }

        @Override
        public boolean is(final NativeQueue.State other) {
            return this == other;
        }

        @Override
        public boolean isAtLeast(final NativeQueue.State other) {
            if (other instanceof State) {
                return this.rank >= ((State) other).rank;
            }
            return false;
        }
    }

    private static final NativeQueue sNativeQueue =
        new NativeQueue(State.INITIAL, State.RUNNING);

    /* package */ static NativeQueue getNativeQueue() {
        return sNativeQueue;
    }

    public static final State MIN_STATE = State.INITIAL;
    public static final State MAX_STATE = State.EXITED;

    private static final Runnable UI_THREAD_CALLBACK = new Runnable() {
        @Override
        public void run() {
            ThreadUtils.assertOnUiThread();
            long nextDelay = runUiThreadCallback();
            if (nextDelay >= 0) {
                ThreadUtils.getUiHandler().postDelayed(this, nextDelay);
            }
        }
    };

    private static final GeckoThread INSTANCE = new GeckoThread();

    @WrapForJNI
    private static final ClassLoader clsLoader = GeckoThread.class.getClassLoader();
    @WrapForJNI
    private static MessageQueue msgQueue;
    @WrapForJNI
    private static int uiThreadId;

    private boolean mInitialized;
    private String[] mArgs;

    // Main process parameters
    public static final int FLAG_DEBUGGING = 1; // Debugging mode.
    public static final int FLAG_PRELOAD_CHILD = 2; // Preload child during main thread start.

    private GeckoProfile mProfile;
    private String mExtraArgs;
    private int mFlags;

    // Child process parameters
    private int mCrashFileDescriptor = -1;
    private int mIPCFileDescriptor = -1;
    private int mCrashAnnotationFileDescriptor = -1;

    GeckoThread() {
        setName("Gecko");
    }

    @WrapForJNI
    private static boolean isChildProcess() {
        return INSTANCE.mIPCFileDescriptor != -1;
    }

    private synchronized boolean init(final GeckoProfile profile, final String[] args,
                                      final String extraArgs, final int flags,
                                      final int crashFd, final int ipcFd,
                                      final int crashAnnotationFd) {
        ThreadUtils.assertOnUiThread();
        uiThreadId = android.os.Process.myTid();

        if (mInitialized) {
            return false;
        }

        mProfile = profile;
        mArgs = args;
        mExtraArgs = extraArgs;
        mFlags = flags;
        mCrashFileDescriptor = crashFd;
        mIPCFileDescriptor = ipcFd;
        mCrashAnnotationFileDescriptor = crashAnnotationFd;

        mInitialized = true;
        notifyAll();
        return true;
    }

    public static boolean initMainProcess(final GeckoProfile profile, final String extraArgs,
                                          final int flags) {
        return INSTANCE.init(profile, /* args */ null, extraArgs, flags,
                                 /* crashFd */ -1, /* ipcFd */ -1,
                                 /* crashAnnotationFd */ -1);
    }

    public static boolean initChildProcess(final String[] args, final int crashFd,
                                           final int ipcFd,
                                           final int crashAnnotationFd) {
        return INSTANCE.init(/* profile */ null, args, /* extraArgs */ null,
                                 /* flags */ 0, crashFd, ipcFd, crashAnnotationFd);
    }

    private static boolean canUseProfile(final Context context, final GeckoProfile profile,
                                         final String profileName, final File profileDir) {
        if (profileDir != null && !profileDir.isDirectory()) {
            return false;
        }

        if (profile == null) {
            // We haven't initialized; any profile is okay as long as we follow the guest mode setting.
            return GeckoProfile.shouldUseGuestMode(context) ==
                    GeckoProfile.isGuestProfile(context, profileName, profileDir);
        }

        // We already initialized and have a profile; see if it matches ours.
        try {
            return profileDir == null ? profileName.equals(profile.getName()) :
                    profile.getDir().getCanonicalPath().equals(profileDir.getCanonicalPath());
        } catch (final IOException e) {
            Log.e(LOGTAG, "Cannot compare profile " + profileName);
            return false;
        }
    }

    public static boolean canUseProfile(final String profileName, final File profileDir) {
        if (profileName == null) {
            throw new IllegalArgumentException("Null profile name");
        }
        return canUseProfile(GeckoAppShell.getApplicationContext(), getActiveProfile(),
                             profileName, profileDir);
    }

    public static boolean initMainProcessWithProfile(final String profileName,
                                                     final File profileDir,
                                                     final String args) {
        if (profileName == null) {
            throw new IllegalArgumentException("Null profile name");
        }

        final Context context = GeckoAppShell.getApplicationContext();
        final GeckoProfile profile = getActiveProfile();

        if (!canUseProfile(context, profile, profileName, profileDir)) {
            // Profile is incompatible with current profile.
            return false;
        }

        if (profile != null) {
            // We already have a compatible profile.
            return true;
        }

        // We haven't initialized yet; okay to initialize now.
        return initMainProcess(GeckoProfile.get(context, profileName, profileDir),
                               args, /* flags */ 0);
    }

    public static boolean launch() {
        ThreadUtils.assertOnUiThread();

        if (checkAndSetState(State.INITIAL, State.LAUNCHED)) {
            INSTANCE.start();
            return true;
        }
        return false;
    }

    public static boolean isLaunched() {
        return !isState(State.INITIAL);
    }

    @RobocopTarget
    public static boolean isRunning() {
        return isState(State.RUNNING);
    }

    private static void loadGeckoLibs(final Context context, final String resourcePath) {
        GeckoLoader.loadSQLiteLibs(context, resourcePath);
        GeckoLoader.loadNSSLibs(context, resourcePath);
        GeckoLoader.loadGeckoLibs(context, resourcePath);
        setState(State.LIBS_READY);
    }

    private static void initGeckoEnvironment() {
        final Context context = GeckoAppShell.getApplicationContext();
        GeckoLoader.loadMozGlue(context);
        setState(State.MOZGLUE_READY);

        final Locale locale = Locale.getDefault();
        final Resources res = context.getResources();
        if (locale.toString().equalsIgnoreCase("zh_hk")) {
            final Locale mappedLocale = Locale.TRADITIONAL_CHINESE;
            Locale.setDefault(mappedLocale);
            Configuration config = res.getConfiguration();
            config.locale = mappedLocale;
            res.updateConfiguration(config, null);
        }

        final String resourcePath = context.getPackageResourcePath();
        GeckoLoader.setupGeckoEnvironment(context, context.getFilesDir().getPath());

        try {
            loadGeckoLibs(context, resourcePath);
            return;
        } catch (final Exception e) {
            // Cannot load libs; try clearing the cached files.
            Log.w(LOGTAG, "Clearing cache after load libs exception", e);
        }

        FileUtils.delTree(GeckoLoader.getCacheDir(context),
                          new FileUtils.FilenameRegexFilter(".*\\.so(?:\\.crc)?$"),
                          /* recurse */ true);

        if (!GeckoLoader.verifyCRCs(resourcePath)) {
            setState(State.CORRUPT_APK);
            EventDispatcher.getInstance().dispatch("Gecko:CorruptAPK", null);
            return;
        }

        // Then try loading again. If this throws again, we actually crash.
        loadGeckoLibs(context, resourcePath);
    }

    private String[] getMainProcessArgs() {
        final Context context = GeckoAppShell.getApplicationContext();
        final ArrayList<String> args = new ArrayList<String>();

        // argv[0] is the program name, which for us is the package name.
        args.add(context.getPackageName());
        args.add("-greomni");
        args.add(context.getPackageResourcePath());

        final GeckoProfile profile = getProfile();
        if (profile.isCustomProfile()) {
            args.add("-profile");
            args.add(profile.getDir().getAbsolutePath());
        } else {
            profile.getDir(); // Make sure the profile dir exists.
            args.add("-P");
            args.add(profile.getName());
        }

        if (mExtraArgs != null) {
            final StringTokenizer st = new StringTokenizer(mExtraArgs);
            while (st.hasMoreTokens()) {
                final String token = st.nextToken();
                if ("-P".equals(token) || "-profile".equals(token)) {
                    // Skip -P and -profile arguments because we added them above.
                    if (st.hasMoreTokens()) {
                        st.nextToken();
                    }
                    continue;
                }
                args.add(token);
            }
        }

        return args.toArray(new String[args.size()]);
    }

    @RobocopTarget
    public static GeckoProfile getActiveProfile() {
        return INSTANCE.getProfile();
    }

    public synchronized GeckoProfile getProfile() {
        if (!mInitialized) {
            return null;
        }
        if (isChildProcess()) {
            throw new UnsupportedOperationException(
                    "Cannot access profile from child process");
        }
        if (mProfile == null) {
            final Context context = GeckoAppShell.getApplicationContext();
            mProfile = GeckoProfile.initFromArgs(context, mExtraArgs);
        }
        return mProfile;
    }

    @Override
    public void run() {
        Log.i(LOGTAG, "preparing to run Gecko");

        Looper.prepare();
        GeckoThread.msgQueue = Looper.myQueue();
        ThreadUtils.sGeckoThread = this;
        ThreadUtils.sGeckoHandler = new Handler();

        // Preparation for pumpMessageLoop()
        final MessageQueue.IdleHandler idleHandler = new MessageQueue.IdleHandler() {
            @Override public boolean queueIdle() {
                final Handler geckoHandler = ThreadUtils.sGeckoHandler;
                Message idleMsg = Message.obtain(geckoHandler);
                // Use |Message.obj == GeckoHandler| to identify our "queue is empty" message
                idleMsg.obj = geckoHandler;
                geckoHandler.sendMessageAtFrontOfQueue(idleMsg);
                // Keep this IdleHandler
                return true;
            }
        };
        Looper.myQueue().addIdleHandler(idleHandler);

        initGeckoEnvironment();

        if ((mFlags & FLAG_PRELOAD_CHILD) != 0) {
            ThreadUtils.postToBackgroundThread(new Runnable() {
                @Override
                public void run() {
                    // Preload the content ("tab") child process.
                    GeckoProcessManager.getInstance().preload("tab");
                }
            });
        }

        // Wait until initialization before calling Gecko entry point.
        synchronized (this) {
            while (!mInitialized || !isState(State.LIBS_READY)) {
                try {
                    wait();
                } catch (final InterruptedException e) {
                }
            }
        }

        final String[] args = isChildProcess() ? mArgs : getMainProcessArgs();

        if ((mFlags & FLAG_DEBUGGING) != 0) {
            try {
                Thread.sleep(5 * 1000 /* 5 seconds */);
            } catch (final InterruptedException e) {
            }
        }

        Log.w(LOGTAG, "zerdatime " + SystemClock.elapsedRealtime() + " - runGecko");

        if ((mFlags & FLAG_DEBUGGING) != 0) {
            Log.i(LOGTAG, "RunGecko - args = " + TextUtils.join(" ", args));
        }

        // And go.
        GeckoLoader.nativeRun(args, mCrashFileDescriptor, mIPCFileDescriptor, mCrashAnnotationFileDescriptor);

        // And... we're done.
        final boolean restarting = isState(State.RESTARTING);
        setState(State.EXITED);

        final GeckoBundle data = new GeckoBundle(1);
        data.putBoolean("restart", restarting);
        EventDispatcher.getInstance().dispatch("Gecko:Exited", data);

        // Remove pumpMessageLoop() idle handler
        Looper.myQueue().removeIdleHandler(idleHandler);
    }

    @WrapForJNI(calledFrom = "gecko")
    private static boolean pumpMessageLoop(final Message msg) {
        final Handler geckoHandler = ThreadUtils.sGeckoHandler;

        if (msg.obj == geckoHandler && msg.getTarget() == geckoHandler) {
            // Our "queue is empty" message; see runGecko()
            return false;
        }

        if (msg.getTarget() == null) {
            Looper.myLooper().quit();
        } else {
            msg.getTarget().dispatchMessage(msg);
        }

        return true;
    }

    /**
     * Check that the current Gecko thread state matches the given state.
     *
     * @param state State to check
     * @return True if the current Gecko thread state matches
     */
    public static boolean isState(final State state) {
        return sNativeQueue.getState().is(state);
    }

    /**
     * Check that the current Gecko thread state is at the given state or further along,
     * according to the order defined in the State enum.
     *
     * @param state State to check
     * @return True if the current Gecko thread state matches
     */
    public static boolean isStateAtLeast(final State state) {
        return sNativeQueue.getState().isAtLeast(state);
    }

    /**
     * Check that the current Gecko thread state is at the given state or prior,
     * according to the order defined in the State enum.
     *
     * @param state State to check
     * @return True if the current Gecko thread state matches
     */
    public static boolean isStateAtMost(final State state) {
        return state.isAtLeast(sNativeQueue.getState());
    }

    /**
     * Check that the current Gecko thread state falls into an inclusive range of states,
     * according to the order defined in the State enum.
     *
     * @param minState Lower range of allowable states
     * @param maxState Upper range of allowable states
     * @return True if the current Gecko thread state matches
     */
    public static boolean isStateBetween(final State minState, final State maxState) {
        return isStateAtLeast(minState) && isStateAtMost(maxState);
    }

    @WrapForJNI(calledFrom = "gecko")
    private static void setState(final State newState) {
        sNativeQueue.setState(newState);
    }

    @WrapForJNI(calledFrom = "gecko")
    private static boolean checkAndSetState(final State expectedState,
                                            final State newState) {
        return sNativeQueue.checkAndSetState(expectedState, newState);
    }

    @WrapForJNI(stubName = "SpeculativeConnect")
    private static native void speculativeConnectNative(String uri);

    public static void speculativeConnect(final String uri) {
        // This is almost always called before Gecko loads, so we don't
        // bother checking here if Gecko is actually loaded or not.
        // Speculative connection depends on proxy settings,
        // so the earliest it can happen is after profile is ready.
        queueNativeCallUntil(State.PROFILE_READY, GeckoThread.class,
                             "speculativeConnectNative", uri);
    }

    @WrapForJNI @RobocopTarget
    public static native void waitOnGecko();

    @WrapForJNI(stubName = "OnPause", dispatchTo = "gecko")
    private static native void nativeOnPause();

    public static void onPause() {
        if (isStateAtLeast(State.PROFILE_READY)) {
            nativeOnPause();
        } else {
            queueNativeCallUntil(State.PROFILE_READY, GeckoThread.class,
                                 "nativeOnPause");
        }
    }

    @WrapForJNI(stubName = "OnResume", dispatchTo = "gecko")
    private static native void nativeOnResume();

    public static void onResume() {
        if (isStateAtLeast(State.PROFILE_READY)) {
            nativeOnResume();
        } else {
            queueNativeCallUntil(State.PROFILE_READY, GeckoThread.class,
                                 "nativeOnResume");
        }
    }

    @WrapForJNI(stubName = "CreateServices", dispatchTo = "gecko")
    private static native void nativeCreateServices(String category, String data);

    public static void createServices(final String category, final String data) {
        if (isStateAtLeast(State.PROFILE_READY)) {
            nativeCreateServices(category, data);
        } else {
            queueNativeCallUntil(State.PROFILE_READY, GeckoThread.class, "nativeCreateServices",
                                 String.class, category, String.class, data);
        }
    }

    @WrapForJNI(calledFrom = "ui")
    /* package */ static native long runUiThreadCallback();

    @WrapForJNI(dispatchTo = "gecko")
    public static native void forceQuit();

    @WrapForJNI
    private static void requestUiThreadCallback(long delay) {
        ThreadUtils.getUiHandler().postDelayed(UI_THREAD_CALLBACK, delay);
    }

    /**
     * Queue a call to the given static method until Gecko is in the RUNNING state.
     */
    public static void queueNativeCall(final Class<?> cls, final String methodName,
                                       final Object... args) {
        sNativeQueue.queueUntilReady(cls, methodName, args);
    }

    /**
     * Queue a call to the given instance method until Gecko is in the RUNNING state.
     */
    public static void queueNativeCall(final Object obj, final String methodName,
                                       final Object... args) {
        sNativeQueue.queueUntilReady(obj, methodName, args);
    }

    /**
     * Queue a call to the given instance method until Gecko is in the RUNNING state.
     */
    public static void queueNativeCallUntil(final State state, final Object obj, final String methodName,
                                       final Object... args) {
        sNativeQueue.queueUntil(state, obj, methodName, args);
    }

    /**
     * Queue a call to the given static method until Gecko is in the RUNNING state.
     */
    public static void queueNativeCallUntil(final State state, final Class<?> cls, final String methodName,
                                       final Object... args) {
        sNativeQueue.queueUntil(state, cls, methodName, args);
    }
}
