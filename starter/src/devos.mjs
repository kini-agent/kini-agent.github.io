#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';

const home=()=>path.resolve(process.env.DEVOS_HOME||path.join(os.homedir(),'devos'));
const ensure=p=>fs.mkdirSync(p,{recursive:true});
const exists=p=>fs.existsSync(p);
const run=(cmd,args=[],opts={})=>spawnSync(cmd,args,{encoding:'utf8',shell:process.platform==='win32',...opts});
const has=cmd=>(process.platform==='win32'?run('where',[cmd]):run('which',[cmd])).status===0;
const slug=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'')||'project';
const write=(p,c)=>{ensure(path.dirname(p)); if(!exists(p)) fs.writeFileSync(p,c,'utf8');};

function header(){console.log('\nDEVOS  AI Development Operating System\n');}
function doctor(){
  header();
  for(const [label,cmd] of [['Git','git'],['Node','node'],['npm','npm'],['pnpm','pnpm'],['Codex','codex']]){
    console.log(`${has(cmd)?'✓':'!'} ${label}`);
  }
  console.log(`\nDEVOS_HOME  ${home()}`);
  console.log(`Workspace   ${exists(home())?'ready':'not initialized'}`);
}
function init(){
  header();
  const h=home();
  ensure(path.join(h,'projects')); ensure(path.join(h,'worktrees')); ensure(path.join(h,'_control','rules','languages'));
  write(path.join(h,'_control','PROJECTS.md'),'# Projects\n');
  write(path.join(h,'_control','ROADMAP.md'),'# Workspace Roadmap\n');
  write(path.join(h,'_control','AGENTS.md'),`# DEVOS Workspace Rules\n\n- Project boundaries are Git repositories.\n- Parallel tasks use Git worktrees.\n- Agents must not bypass project capabilities or safety rules.\n`);
  write(path.join(h,'_control','rules','ARCHITECTURE.md'),`# AI-Native Architecture\n\nDomain/Core → Application/Service → Capability/Tool → API/CLI/MCP/Agent/UI\n\nAgents should use safe capabilities instead of direct DB or infrastructure access.\n`);
  write(path.join(h,'_control','rules','AUTOPILOT.md'),`# Autopilot\n\nImplement → Verify → Review → Repair → Verify again.\nAsk only for destructive, paid, secret-dependent, or product-direction decisions.\n`);
  console.log(`✓ Workspace initialized: ${h}`);
}
async function ask(rl,label,def=''){const v=(await rl.question(`${label}${def?` [${def}]`:''}: `)).trim();return v||def;}
async function choose(rl,label,items,def=0){console.log(`\n${label}`);items.forEach((x,i)=>console.log(` ${i===def?'›':' '} ${i+1}. ${x[0]}`));while(true){const r=(await rl.question(`선택 [${def+1}]: `)).trim();const n=r===''?def:Number(r)-1;if(Number.isInteger(n)&&n>=0&&n<items.length)return items[n][1];}}
async function newProject(ideaArg){
  header(); if(!exists(home())) init();
  const rl=readline.createInterface({input,output});
  try{
    const idea=ideaArg||await ask(rl,'무엇을 만들어볼까요?');
    const s=slug(await ask(rl,'프로젝트 폴더명',slug(idea).slice(0,36)));
    const name=await ask(rl,'프로젝트 이름',s);
    const mode=await choose(rl,'개발 모드',[['Quick','quick'],['Standard','standard'],['Strict','strict'],['Production','production']],1);
    const language=await choose(rl,'주 언어',[['TypeScript','typescript'],['Java','java'],['Python','python'],['Rust','rust'],['C#/.NET','dotnet'],['Go','go']],0);
    const platform=await choose(rl,'플랫폼',[['Web','web'],['Mobile','mobile'],['Desktop','desktop'],['Web + Mobile','web+mobile'],['Multi-platform','multi']],0);
    const autonomy=await choose(rl,'Agent 자율성',[['Assisted','assisted'],['Standard','standard'],['Autonomous','autonomous']],1);
    const user=await ask(rl,'주 사용자는?','일반 사용자');
    const problem=await ask(rl,'가장 중요한 문제/목표');
    const mvp=await ask(rl,'MVP 핵심 기능 (쉼표 구분)');
    const db=await choose(rl,'데이터 저장',[['PostgreSQL','postgresql'],['SQLite','sqlite'],['Local','local'],['Undecided','undecided']],0);
    if(!idea||!problem||!mvp||(['strict','production'].includes(mode)&&db==='undecided')){
      console.log('\nPROJECT NOT READY\n필수 결정이 부족해 생성하지 않았습니다.'); return;
    }
    const root=path.join(home(),'projects',s); if(exists(root)) throw new Error(`이미 존재: ${root}`);
    ensure(path.join(root,'docs')); ensure(path.join(root,'planning')); ensure(path.join(root,'.devos'));
    fs.writeFileSync(path.join(root,'AGENTS.md'),`# ${name} Agent Rules\n\n- Follow docs/SPEC.md and docs/DEFINITION_OF_DONE.md.\n- Do not access DB directly from agents/UI.\n- Use Tool/Service/Core boundaries.\n- Implement → test → self-review → repair → verify.\n- Ask only for irreversible, paid, secret, or product-direction decisions.\n`);
    fs.writeFileSync(path.join(root,'docs','PRODUCT.md'),`# Product\n\n## Idea\n${idea}\n\n## Target User\n${user}\n\n## Core Problem\n${problem}\n`);
    fs.writeFileSync(path.join(root,'docs','SPEC.md'),`# Specification\n\n## MVP\n${mvp}\n\n## Platform\n${platform}\n\n## Language\n${language}\n\n## Database\n${db}\n`);
    fs.writeFileSync(path.join(root,'docs','ARCHITECTURE.md'),`# Architecture\n\nDomain/Core → Application/Service → Capability/Tool → API/CLI/MCP/Agent/UI\n`);
    fs.writeFileSync(path.join(root,'docs','CAPABILITIES.md'),'# Capability Catalog\n\nDefine small, typed, auditable tools here.\n');
    fs.writeFileSync(path.join(root,'docs','DEFINITION_OF_DONE.md'),`# Definition of Done\n\n- Build passes\n- Type/lint checks pass\n- Relevant tests pass\n- Error/loading/empty states handled\n- Security/permissions reviewed\n- Docs match implementation\n- Self-review completed\n`);
    fs.writeFileSync(path.join(root,'planning','ROADMAP.md'),'# Roadmap\n\n- [ ] M1 Foundation\n- [ ] M2 Core MVP\n- [ ] M3 Polish & Release Audit\n');
    fs.writeFileSync(path.join(root,'planning','CURRENT.md'),'# Current\n\nStatus: Ready\nNext: Plan M1\n');
    fs.writeFileSync(path.join(root,'planning','DECISIONS.md'),'# Decisions\n');
    fs.writeFileSync(path.join(root,'.devos','project.json'),JSON.stringify({schemaVersion:1,name,slug:s,idea,mode,language,platform,autonomy,targetUser:user,coreProblem:problem,mvp,database:db},null,2));
    fs.writeFileSync(path.join(root,'.gitignore'),'node_modules/\n.env\n.env.*\ndist/\nbuild/\n.DS_Store\n');
    if(has('git')) run('git',['init'],{cwd:root});
    fs.appendFileSync(path.join(home(),'_control','PROJECTS.md'),`- [ ] ${name} — ${s} — ${mode} — ${language}\n`);
    console.log(`\nREADY\n✓ ${root}\n\ncd "${root}"\ndevos status\ndevos codex`);
  } finally {rl.close();}
}
function projectRoot(){let p=process.cwd();while(true){if(exists(path.join(p,'.devos','project.json')))return p;const q=path.dirname(p);if(q===p)return null;p=q;}}
function status(){header();const r=projectRoot();if(!r){console.log('DEVOS project 폴더 안에서 실행하세요.');return;}const c=JSON.parse(fs.readFileSync(path.join(r,'.devos','project.json'),'utf8'));console.log(`${c.name}\nPath: ${r}\nLanguage: ${c.language}\nMode: ${c.mode}\nAutonomy: ${c.autonomy}`);const cur=path.join(r,'planning','CURRENT.md');if(exists(cur))console.log('\n'+fs.readFileSync(cur,'utf8'));}
function worktree(name){header();const r=projectRoot();if(!r)throw new Error('DEVOS project 안에서 실행하세요.');if(!has('git'))throw new Error('Git 필요');const n=slug(name),target=path.join(home(),'worktrees',path.basename(r),n),branch=`feat/${n}`;ensure(path.dirname(target));const x=run('git',['worktree','add',target,'-b',branch],{cwd:r});if(x.status!==0)throw new Error(x.stderr||x.stdout);console.log(`✓ ${target}\n✓ ${branch}\n\ncd "${target}" && codex`);}
function codex(){header();if(!has('codex')){console.log('Codex CLI가 없습니다: npm i -g @openai/codex');return;}spawnSync('codex',[],{cwd:projectRoot()||process.cwd(),stdio:'inherit',shell:process.platform==='win32'});}
function help(){header();console.log('devos doctor\ndevos init\ndevos new [아이디어]\ndevos status\ndevos worktree new <이름>\ndevos codex');}
const [cmd,...args]=process.argv.slice(2);try{if(cmd==='doctor')doctor();else if(cmd==='init')init();else if(cmd==='new')await newProject(args.join(' '));else if(cmd==='status')status();else if(cmd==='worktree'&&args[0]==='new')worktree(args.slice(1).join('-'));else if(cmd==='codex')codex();else help();}catch(e){console.error('\nERROR '+e.message);process.exitCode=1;}
