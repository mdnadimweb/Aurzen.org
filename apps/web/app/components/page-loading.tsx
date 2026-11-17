// Shown while a page's data loads. Used only by routes that can never be "not found" (shop, sale):
// a loading boundary makes a page start streaming at once, which would turn a missing product or
// collection into an HTTP 200 instead of a real 404.
export default function PageLoading(){return <main className="section empty" role="status"><div className="eyebrow">AURZÉN</div><p>Loading your next little find…</p></main>;}
