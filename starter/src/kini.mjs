#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { runDevOS } from './systems/devos-profiled.mjs';
import { ensureProfile, showProfile, exportProfile, importProfile, resetProfile } from './profile.mjs';

const KINI_VERSION = '0.2.0';
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
  ensure(path.join(h,'backups'));
  ensureProfile(h);

  write(path.join(h,'_control','SYSTEMS.md'),`# KINI Systems\n\n- KINI Dev — software development — built-in\n- KINI Data — planned\n- KINI Content — planned\n- KINI Ops — planned\n`);
  write(path.join(h,'_control','PROJECTS.md'),'# Projects\n');
  write(path.join(h,'_control','ROADMAP.md'),'# Workspace Roadmap\n');
  write(path.join(h,'_control','AGENTS.md'),`# KINI Workspace Rules\n\nKINI Core is public and resettable.\nPersonal preferences belong in profile/ and must not be hard-coded into Core.\n\n- Route work to a registered system before execution.\n- Apply profile preferences only after Core safety and architecture rules.\n- Keep unrelated products in separate Git repositories.\n- Use worktrees for parallel tasks in the same repository.\n- Never bypass a system's permission or quality rules.\n- Require human approval for destructive, paid, secret-dependent, or production-critical actions.\n`);
  write(path.join(h,'_control','rules','ROUTING.md'),`# Routing\n\nCurrent built-in system:\n\n- software development / coding / app work → KINI Dev\n\nFuture systems may register their own intents and commands.\n`);
  write(path.join(h,'_control','rules','PROFILE.md'),`# Profile Resolution\n\nKINI resolves instructions in this order:\n\n1. Core safety rules\n2. System rules\n3. Project rules\n4. User profile preferences\n\nA user profile may specialize defaults but must not weaken safety rules.\n`);
  write(path.join(h,'systems','devos','system.json'), JSON.stringify({
    schemaVersion:1,
    id:'devos',
    name:'KINI Dev',
    command:'dev',
    status:'built-in',
    intents:['software-development','coding','app-development','bug-fixing'],
    commands:['doctor','new','status','worktree','agent','claude','codex'],
    description:'Software development operating system for KINI.'
  },null,2));
  console.log(`✓ KINI workspace initialized: ${h}`);
  console.log('✓ Personal profile ready: profile/');
  console.log('✓ Built-in system: KINI Dev');
}
function doctor(){
  banner();
  // ⚠️ 코딩 에이전트는 여러 개 중 **하나만 있으면 됩니다.** 예전에는 Codex 만
  // 확인해서, Claude 를 쓰는 사람에게는 멀쩡한 환경이 "missing" 으로 보였습니다.
  const rows=[['Git','git'],['Node.js','node'],['npm','npm'],['pnpm','pnpm']];
  for(const [label,cmd] of rows) console.log(`${has(cmd)?'✓':'!'} ${label}`);
  const agents=[['Claude Code','claude'],['Codex CLI','codex']].filter(([,c])=>has(c));
  console.log(`${agents.length?'✓':'!'} 코딩 에이전트${agents.length?`  ${agents.map(([l])=>l).join(', ')}`:'  (없음 - kini dev agent list)'}`);
  console.log(`\nKINI_HOME  ${home()}`);
  console.log(`Workspace  ${exists(home())?'ready':'not initialized'}`);
  console.log(`Profile    ${exists(path.join(home(),'profile'))?'ready':'not initialized'}`);
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
function profileCommand(args){
  const [sub,...rest]=args;
  if(!exists(home())) init();
  if(!sub || sub==='show') showProfile(home());
  else if(sub==='export') exportProfile(home(),rest[0]);
  else if(sub==='import') importProfile(home(),rest[0]);
  else if(sub==='reset') resetProfile(home(),rest);
  else {
    console.log(`KINI Profile\n\n  kini profile show\n  kini profile export <폴더>\n  kini profile import <폴더>\n  kini profile reset --dry-run\n  kini profile reset --yes\n`);
  }
}
function help(){
  banner();
  console.log(`처음 시작하기\n  kini init\n  kini doctor\n  kini systems\n\n개인 설정\n  kini profile show\n  kini profile export ./my-kini-profile\n  kini profile import ./my-kini-profile\n  kini profile reset --dry-run\n\n소프트웨어 개발\n  kini dev new "만들고 싶은 앱"\n  kini dev status\n  kini dev worktree new <기능명>\n  kini dev codex\n\n빠른 시작\n  kini "타임라인 앱 만들어볼까?"\n\nKINI Core는 공통으로 유지되고, 개인화는 ~/kini/profile/에 저장됩니다.\n`);
}
function looksLikeIdea(args){
  if(args.length===0) return false;
  const first=args[0]||'';
  const reserved=['init','doctor','systems','profile','dev','devos','help','--help','-h','--version','version'];
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
  else if(cmd==='profile') profileCommand(rest);
  else if(cmd==='dev' || cmd==='devos') {
    if(!exists(home())) init();
    ensureProfile(home());
    await runDevOS(rest,{kiniHome:home()});
  } else if(looksLikeIdea(args)){
    if(!exists(home())) init();
    ensureProfile(home());
    console.log('\n현재 설치된 실행 시스템은 KINI Dev 하나입니다.');
    console.log('입력한 아이디어를 KINI Dev의 새 프로젝트로 연결합니다.\n');
    await runDevOS(['new',args.join(' ')],{kiniHome:home()});
  } else help();
}catch(e){
  console.error(`\nERROR ${e.message}`);
  process.exitCode=1;
}
