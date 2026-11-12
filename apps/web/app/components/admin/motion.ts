import type {Variants} from 'motion/react';

/** --ease-premium from motion.css. */
export const easePremium=[0.22,1,0.36,1] as const;

/** Card container: children fade and rise in, 60ms apart. */
export const staggerContainer=(reduced:boolean|null):Variants=>({
  hidden:{},
  visible:{transition:{staggerChildren:reduced?0:0.06}},
});
export const riseIn=(reduced:boolean|null):Variants=>({
  hidden:{opacity:0,y:14},
  visible:{opacity:1,y:0,transition:{duration:reduced?0:0.5,ease:easePremium}},
});
/** Duration helper: everything is instant under reduced motion. */
export const ms=(reduced:boolean|null,value:number)=>reduced?0:value/1000;
