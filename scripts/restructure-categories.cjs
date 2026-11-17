#!/usr/bin/env node
// One-off category restructure: four fixed main categories, every product in one subcategory.
//
//   node scripts/restructure-categories.cjs <catalog.json>          dry run: prints product -> category
//   node scripts/restructure-categories.cjs <catalog.json> --ops    prints the admin API steps as JSON
//
// <catalog.json> is a backup of GET /api/catalog/ (take one first: it is the rollback record).
// The steps use the normal admin actions (addCategory, editCategory, deleteCategory, moveProducts,
// saveStorefront) and are computed from the current state, so re-running after applying prints
// nothing to do. Products and orders are never deleted; only empty subcategories are removed.
'use strict';
const fs=require('node:fs');

const MAINS=["Men's collection",'Ladies Fashion','Mystery Box','Love & Care'];
// Planned subcategories and the products in them (by product ID, reviewed by the owner).
const PLAN={
  "Men's collection":{
    'Suits & Tuxedos':[74,75,76,77,78,79,80,81,85],
    'Blazers & Jackets':[82,83,84,86,87,88,89],
    'Shirts':[90,91,92,93,94,95,96],
    'Tees & Knitwear':[97,98],
    'Denim':[125,127],
  },
  'Ladies Fashion':{
    'One Piece & Dresses':[50,51,54,55,56,57,58,59,60,62,63,64,65,66,67,68,69],
    'Long Dresses':[100,101,102,103,104,106,108,113,114,115,117,118,119,120,121,122,123],
    'Three Piece':[105,107,116],
    'Kaftans':[99,109,110,111,112],
    'Gowns':[53,61,126],
    'Abayas':[15,16,17,18,19],
    'Bridal & Party':[70,71,72,73],
    'Scarves':[124],
  },
};
// Former top-level categories that become subcategories (kept, so their URL slug stays).
const DEMOTE={'Abayas':'Ladies Fashion','Bridal & Party':'Ladies Fashion'};

function plan(catalog){
  const cats=new Map((catalog.categoryDetails||[]).map(c=>[c.name,c]));
  const target=new Map();
  for(const [main,subs] of Object.entries(PLAN))for(const [sub,ids] of Object.entries(subs))for(const id of ids)target.set(id,{main,sub});
  const rows=catalog.products.map(p=>({id:p.id,name:p.name,from:p.category,...(target.get(p.id)||{main:null,sub:null})}));
  const ops=[];
  for(const name of MAINS)if(!cats.has(name))ops.push({action:'addCategory',name});
  const wanted=new Set(Object.values(PLAN).flatMap(s=>Object.keys(s)));
  const counts=new Map();for(const p of catalog.products)counts.set(p.category,(counts.get(p.category)||0)+1);
  // Empty subcategories that are not part of the plan (or would block a move) are removed.
  for(const c of cats.values())if(c.parent&&!wanted.has(c.name)&&!counts.get(c.name))ops.push({action:'deleteCategory',name:c.name});
  for(const [name,parent] of Object.entries(DEMOTE)){const c=cats.get(name);if(c&&c.parent!==parent)ops.push({action:'editCategory',original:name,name,parent});}
  for(const [main,subs] of Object.entries(PLAN))for(const sub of Object.keys(subs)){const c=cats.get(sub);if(!c&&!DEMOTE[sub])ops.push({action:'addCategory',name:sub,parent:main});}
  const moves=new Map();
  for(const r of rows)if(r.sub&&r.from!==r.sub){if(!moves.has(r.sub))moves.set(r.sub,[]);moves.get(r.sub).push(r.id);}
  for(const [category,ids] of moves)ops.push({action:'moveProducts',category,ids});
  const s=catalog.storefront||{announcement:{message:'',detail:''},covers:{}};
  const covers=Object.fromEntries(Object.entries(s.covers||{}).filter(([name])=>MAINS.includes(name)));
  if(JSON.stringify(s.featured||[])!==JSON.stringify(MAINS)||Object.keys(covers).length!==Object.keys(s.covers||{}).length)
    ops.push({action:'saveStorefront',storefront:{...s,covers,featured:MAINS}});
  return {rows,ops};
}

if(require.main===module){
  const [file,flag]=process.argv.slice(2);
  if(!file){console.error('Usage: node scripts/restructure-categories.cjs <catalog.json> [--ops]');process.exit(1);}
  const {rows,ops}=plan(JSON.parse(fs.readFileSync(file,'utf8')));
  if(flag==='--ops'){console.log(JSON.stringify(ops,null,1));process.exit(0);}
  const unplanned=rows.filter(r=>!r.sub);
  for(const main of MAINS){
    const inMain=rows.filter(r=>r.main===main);
    console.log(`\n${main} (${inMain.length})`);
    for(const sub of Object.keys(PLAN[main]||{})){const list=inMain.filter(r=>r.sub===sub);console.log(`  ${sub} (${list.length})`);for(const r of list)console.log(`    #${r.id} ${r.name}  [was: ${r.from}]`);}
  }
  if(unplanned.length){console.log('\nNOT IN PLAN (left unchanged, review):');for(const r of unplanned)console.log(`  #${r.id} ${r.name} [${r.from}]`);}
  console.log(`\n${ops.length} admin step(s) to apply:`);for(const o of ops)console.log('  '+o.action+' '+(o.name||o.original||o.category||'storefront')+(o.parent?' -> '+o.parent:'')+(o.ids?' ('+o.ids.length+' products)':''));
}
module.exports={plan,MAINS,PLAN};
