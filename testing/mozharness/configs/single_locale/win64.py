config = {
    "platform": "win64",
    "app_name": "browser",
    "mozconfig_platform": "win64",
    "mozconfig_variant": "l10n-mozconfig",
    "objdir": "obj-firefox",
    "vcs_share_base": "c:/builds/hg-shared",

    # tooltool
    'tooltool_url': 'https://tooltool.mozilla-releng.net/',
    'tooltool_manifest_src': 'browser/config/tooltool-manifests/win64/l10n.manifest',

    # l10n
    "ignore_locales": ["en-US", "ja-JP-mac"],
    "l10n_dir": "l10n",
    "locales_file": "src/browser/locales/all-locales",
    "locales_dir": "browser/locales",
    "hg_l10n_tag": "default",

    # MAR
    "application_ini": "application.ini",
    "local_mar_tool_dir": "dist\\host\\bin",
    "mar": "mar.exe",
    "mbsdiff": "mbsdiff.exe",

    # use mozmake?
    "enable_mozmake": True,
    'exes': {}
}
