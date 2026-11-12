'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="section empty"><h1>Something went wrong.</h1><p>Please try loading the page again.</p><button className="primary" onClick={reset}>Try again</button></main>;}
