import a from "./b64a.js";
import b from "./b64b.js";
const b64 = a + b;
const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const ds = new DecompressionStream("gzip");
const stream = new Blob([bin]).stream().pipeThrough(ds);
const text = await new Response(stream).text();
const url = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
await import(url);
