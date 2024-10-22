// Stepping should ignore nested function declarations.

// Nested functions are hoisted to the top of the function body,
// so technically the first thing that happens when you call the outer function
// is that each inner function is created and bound to a local variable.
// But users don't actually want to see that happen when they're stepping.
// It's super confusing.

function runTest(script, expected) {
    let g = newGlobal();
    g.eval(script);

    let dbg = new Debugger(g);
    let log = [];
    dbg.onEnterFrame = frame => {
        let previousLine = undefined;
        frame.onStep = function() {
            let line = this.script.getOffsetLocation(this.offset).lineNumber;
            if (line != previousLine) {
                log.push(line);
                previousLine = line;
            }
        };

        // Now disable this hook so that we step over function calls, not into them.
        dbg.onEnterFrame = undefined;
    };

    g.f();

    assertEq(log.join(","), expected.join(","));
}

runTest(
    `\
      var f = (function() {      // line 1
        let x = 1;               // line 2
        funcb("funcb");          // line 3
        function funcb(msg) {    // line 4
          console.log(msg)
        }
      });                        // line 7
    `,
    [2, 3, 7]);

// Stopping at the ClassDeclaration on line 8 is fine. For that matter,
// stopping on line 5 wouldn't be so bad if we did it after line 3 and before
// line 8; alas, the actual order of execution is 5, 2, 3, 8... which is too
// confusing.
runTest(
    `\
      function f() {    //  1
        var x = 0;      //  2
        a();            //  3

        function a() {  //  5
          x += 1;       //  6
        }               //  7
        class Car {}    //  8
        return x;       //  9
      }                 // 10
    `,
    [2, 3, 8, 9, 10]);
