#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runDevOS } from './systems/devos.mjs';

const KINI_VERSION = '0.1.0';
const home = () => path.resolve(process.env.KINI_HOME || path.join(os.homedir(), 'kini'));
const ensure = p => fs.mkdirSync(p, { recursive: true });
const exists = p => fs.existsSync(p);
const run = (cmd,args=[],opts={}) => spawnSync(cmd,args,{encoding:'utf8',shell:process.platform==='win32',...opts});
const has = cmd => (process.platform==='win32' ? run('where',[cmd]) : run('which',[cmd])).status===0;
const write = (p,c) => { ensure(path.dirname(p)); if(!exists(p)) fs.writeFileSync(p,c,'utf8'); };

const systems = [
  { id:'devos', command:'dev', name:'KINI Dev', status:'built-in', description:'소프트웨어 개발 프로젝트를 계획하고 실행합니다.' },
  { id:'dataos', command:'data', name:'KINI Data', status:'planned', description:'데이터 수집·정제·분석 작업을 운영합니다.' },
  { id:'contentos', command:'content', name:'KINI Content', status:'planned', description:'콘텐츠 기획·제작·검수·배포를 운영합니다.' },
  { id:'opsos', command:'ops', name:'KINI Ops', status:'planned', description:'서비스 운영과 반복 업무를 관리합니다.' }
];

function banner(){
  console.log('\nKINI  AI Work Operating Layer');
  console.log(`v${KINI_VERSION}\n`);
}
function init(){
  banner();
  const h=home();
  ensure(path.join(h,'_control','rules'));
  ensure(path.join(h,'projects'));
  ensure(path.join(h,'worktrees'));
  ensure(path.join(h,'systems','devos'));
  write(path.join(h,'_control','SYSTEMS.md'),`# KINI Systems\n\n- KINI Dev — software development — built-in\n- KINI Data — planned\n- KINI Content — planned\n- KINI Ops — planned\n`);
  write(path.join(h,'_control','PROJECTS.md'),'# Projects\n');
  write(path.join(h,'_control','ROADMAP.md'),'# Workspace Roadmap\n');
  write(path.join(h,'_control','AGENTS.md'),`# KINI Workspace Rules\n\nKINI is the top-level control layer.\n\n- Route work to a registered system before execution.\n- Keep unrelated products in separate Git repositories.\n- Use worktrees for parallel tasks in the same repository.\n- Never bypass a system's permission or quality rules.\n- Require human approval for destructive, paid, secret-dependent, or production-critical actions.\n`);
  write(path.join(h,'_control','rules','ROUTING.md'),`# Routing\n\nCurrent built-in system:\n\n- software development / coding / app work → KINI Dev\n\nFuture systems may register their own intents and commands.\n`);
  write(path.join(h,'systems','devos','system.json'), JSON.stringify({
    schemaVersion:1,
    id:'devos',
    name:'KINI Dev',
    command:'dev',
    status:'built-in',
    intents:['software-development','coding','app-development','bug-fixing'],
    commands:['doctor','new','status','worktree','codex'],
    description:'Software development operating system for KINI.'
  },null,2));
  console.log(`✓ KINI workspace initialized: ${h}`);
  console.log('✓ Built-in system: KINI Dev');
}
function doctor(){
  banner();
  const rows=[['Git','git'],['Node.js','node'],['npm','npm'],['pnpm','pnpm'],['Codex CLI','codex']];
  for(const [label,cmd] of rows) console.log(`${has(cmd)?'✓':'!'} ${label}`);
  console.log(`\nKINI_HOME  ${home()}`);
  console.log(`Workspace  ${exists(home())?'ready':'not initialized'}`);
  console.log('\nSystems');
  for(const s of systems) console.log(` ${s.status==='built-in'?'✓':'·'} ${s.name.padEnd(15)} ${s.status}`);
}
function listSystems(){
  banner();
  console.log('등록된 시스템\n');
  for(const s of systems){
    console.log(`${s.status==='built-in'?'✓':'○'} ${s.name}`);
    console.log(`  명령: kini ${s.command}`);
    console.log(`  상태: ${s.status}`);
    console.log(`  설명: ${s.description}\n`);
  }
}
function help(){
  banner();
  console.log(`처음 시작하기\n  kini init\n  kini doctor\n\n소프트웨어 개발\n  kini dev new "만들고 싶은 앱"\n  kini dev status\n  kini dev worktree new <기능명>\n  kini dev codex\n\n시스템\n  kini systems\n\n빠른 시작\n  kini "타임라인 앱 만들어볼까?"\n\n현재 자연어 빠른 시작은 KINI Dev로 연결됩니다.\n`);
}
function looksLikeIdea(args){
  if(args.length===0) return false;
  const first=args[0]||'';
  const reserved=['init','doctor','systems','dev','devos','help','--help','-h','--version','version'];
  return !reserved.includes(first);
}

const args=process.argv.slice(2);
const [cmd,...rest]=args;

try{
  if(!cmd || cmd==='help' || cmd==='--help' || cmd==='-h') help();
  else if(cmd==='--version' || cmd==='version') console.log(KINI_VERSION);
  else if(cmd==='init') init();
  else if(cmd==='doctor') doctor();
  else if(cmd==='systems') listSystems();
  else if(cmd==='dev' || cmd==='devos') {
    if(!exists(home())) init();
    await runDevOS(rest,{kiniHome:home()});
  } else if(looksLikeIdea(args)){
    if(!exists(home())) init();
    console.log('\n현재 설치된 실행 시스템은 KINI Dev 하나입니다.');
    console.log('입력한 아이디어를 KINI Dev의 새 프로젝트로 연결합니다.\n');
    await runDevOS(['new',args.join(' ')],{kiniHome:home()});
  } else help();
}catch(e){
  console.error(`\nERROR ${e.message}`);
  process.exitCode=1;
}
