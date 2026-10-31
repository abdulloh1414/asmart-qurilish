import { TODAY } from "./util.js";

export const emptyState=()=>({objects:[],works:[],brigades:[],plan:[],logs:[],materials:[],moves:[],suppliers:[],contracts:[],clients:[],cash:[],debts:[]});
export let S=emptyState();
export function setS(v){S=v}
export const F={planObj:"",payMonth:"",payBrigade:"",logObj:"",logWork:"",logBrigade:"",logMonth:"",cashMonth:"",cashObj:"",mvType:"",mvObj:"",mvQ:"",matQ:"",outBr:"",outMonth:"",supMonth:"",supId:"",ctQ:"",actClient:"",actObj:"",actFrom:TODAY.slice(0,8)+"01",actTo:TODAY};
