'use client';
import {motion,useReducedMotion} from 'motion/react';
import Icon,{type IconName} from '../admin-icons';
import CountUp from './count-up';
import Sparkline from './sparkline';
import {riseIn} from './motion';
import type {Trend} from './metrics';

const trendText=(trend:Trend)=>trend.direction==='none'?'No data to compare yet':trend.percent===null?'Up from no orders in the previous 7 days':trend.direction==='flat'?'No change from the previous 7 days':`${trend.direction==='up'?'Up':'Down'} ${Math.abs(trend.percent)}% from the previous 7 days`;

export default function KpiCard({label,value,format=String,trend,spark,sparkLabel,icon,tone,note,index}:{label:string;value:number;format?:(n:number)=>string;trend:Trend;spark:number[];sparkLabel:string;icon:IconName;tone:'plum'|'gold'|'teal'|'green';note?:string;index:number}){
  const reduced=useReducedMotion();
  return <motion.article className="a-card ov-card ov-kpi" data-fade="" variants={riseIn(reduced)} data-tone={tone}>
    <div className="ov-kpi__top"><span className="ov-kpi__icon"><Icon name={icon}/></span><Sparkline values={spark} delay={300+index*60}/></div>
    <h3 className="ov-kpi__label">{label}</h3>
    <p className="ov-kpi__value"><CountUp value={value} format={format} delay={reduced?0:0.15+index*0.06}/><span className="sr-only">{format(value)}</span></p>
    <p className="ov-kpi__meta">
      <span className="ov-trend" data-direction={trend.direction}><span aria-hidden="true">{trend.direction==='up'?'▲':trend.direction==='down'?'▼':'—'}</span>{trend.direction==='up'||trend.direction==='down'||trend.direction==='flat'?<span aria-hidden="true">{trend.percent===null?'New':Math.abs(trend.percent)+'%'}</span>:null}<span className="sr-only">{trendText(trend)}</span></span>
      <span>{note||'vs previous 7 days'}</span>
    </p>
    <span className="sr-only">{sparkLabel}</span>
  </motion.article>;
}
