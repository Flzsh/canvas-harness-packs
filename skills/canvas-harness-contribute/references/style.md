# Write code that fits

Follow the surrounding file. Public 3.4 uses plain JavaScript, dense functions, short local helpers, semicolons and browser globals usually inside an IIFE; testable modules also export through CommonJS. Keep small changes small. Do not reformat a whole file.

- Save text as UTF-8 with LF. Preserve existing license and creator notices.
- Put comments on their own line. Never append a `//` comment to a line of code, even where legacy code does so.
- Add no npm packages. Use browser APIs and Node builtins. There is no runtime build step, transpiler or new framework; `npm run build` only packages the extension.
- Render synchronously. Fetch, verify and save outside rendering, then render from a coherent state snapshot. Do not make a renderer `async` or create promises/timers on each render.
- Use model functions for normalization, filtering, matching and scheduling. Keep event wiring, DOM and lifecycle work in controllers. Escape Canvas text with existing helpers; prefer `textContent` for plain text.
- Reuse `ReserveSite`, feature gates and account stores. Canvas transport stays GET only. A local planner change, note or draft message is not permission to write to Canvas.
- Bound caches and source sizes. Cancel requests and disconnect observers/listeners on teardown. Schedule animation only when something visible is moving; keep idle work at zero for added behavior.
- Use existing classes and plain new names. Explain desired spacing, state, motion and keyboard behavior in the PR so the owner can draw the look.

Three short excerpts from public 3.4.0 (copy the pattern only when it fits):

`extension/features.js:8` declares a feature and its dependency without a new loader:

```js
feature('planner','Planner & home widgets','Study',['planner-model.js','planner-ui.js','hand-in.js','widgets.js'],[],['dashboard']),
```

`extension/app.js:58` keeps a local state helper small and synchronous:

```js
function taskState(s,id){return s.tasks[id]||(s.tasks[id]={pinned:false,progress:'not-started',notes:'',estimate:0,plannedDate:'',checklist:[]});}
```

`extension/account-writes.js:7` reuses the shared serializer and fails clearly when unavailable:

```js
function run(key,fn){
 const shared=root.ReserveStorage?.runAccountWrite;
 if(typeof shared!=='function')return Promise.reject(Error('The account writer is unavailable. Reload Canvas Harness.'));
 return shared(key,fn);
}
```
