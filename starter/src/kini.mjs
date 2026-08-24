#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { runDevOS } from './systems/devos-profiled.mjs';
import { loadAgents } from './systems/devos.mjs';
import { ensureProfile, showProfile, exportProfile, importProfile, resetProfile } from './profile.mjs';

/**
 * 버전은 package.json 하나만 봅니다.
 *
 * ⚠️ 예전에는 여기에 문자열로 또 적어 두었는데, 배포할 때 한쪽만 올리면
 * `kini --version` 과 npm 이 서로 다른 버전을 말합니다. 틀려도 아무 데서도
 * 안 터지는 종류라 그대로 굳습니다.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8')); }
  catch { return {}; }
})();
const KINI_VERSION = pkg.version || '0.0.0';
/** 필요한 Node 버전도 package.json 의 engines 하나만 봅니다. */
const NODE_MAJOR_REQUIRED = Number((String(pkg.engines?.node || '>=22').match(/\d+/) || [22])[0]);

const home = () => path.resolve(process.env.KINI_HOME || path.join(os.homedir(), 'kini'));
const ensure = p => fs.mkdirSync(p, { recursive: true });
const exists = p => fs.existsSync(p);
/**
 * ⚠️ shell 을 켜지 않습니다. Windows 에서 shell:true 면 인자가 그대로 명령줄에
 * 이어 붙어서, 공백이 든 인자(커밋 메시지 등)가 여러 개로 쪼개집니다. git 도
 * where 도 셸 없이 잘 뜹니다. 셸이 정말 필요한 것은 .cmd 로 깔리는 에이전트
 * CLI 하나뿐이라 그 자리에서만 켭니다.
 */
const run = (cmd,args=[],opts={}) => spawnSync(cmd,args,{encoding:'utf8',...opts});
const has = cmd => (process.platform==='win32' ? run('where',[cmd]) : run('which',[cmd])).status===0;
const sha = s => crypto.createHash('sha256').update(s,'utf8').digest('hex');
const stamp = () => new Date().toISOString().replace(/[:.]/g,'-');

const PLANNED_SYSTEMS = [
  { id:'dataos', command:'data', name:'KINI Data', status:'planned', description:'데이터 수집·정제·분석 작업을 운영합니다.' },
  { id:'contentos', command:'content', name:'KINI Content', status:'planned', description:'콘텐츠 기획·제작·검수·배포를 운영합니다.' },
  { id:'opsos', command:'ops', name:'KINI Ops', status:'planned', description:'서비스 운영과 반복 업무를 관리합니다.' }
];

/**
 * 화면에 보여줄 시스템 목록. 내장 시스템의 이름과 설명은 등록 파일 하나만 봅니다.
 */
function allSystems(){
  const r=systemRegistry();
  return [{ id:r.id, command:r.command, name:r.name, status:r.status, description:r.description }, ...PLANNED_SYSTEMS];
}

/**
 * KINI Core가 관리하는 워크스페이스 문서. 내용의 원본은 여기 한 곳뿐입니다.
 * 개인 설정(profile/)은 여기에 절대 들어오지 않습니다.
 */
function managedFiles(){
  return {
    '_control/SYSTEMS.md': `# KINI Systems\n\n- KINI Dev — software development — built-in\n- KINI Data — planned\n- KINI Content — planned\n- KINI Ops — planned\n`,
    '_control/PROJECTS.md': '# Projects\n',
    '_control/ROADMAP.md': '# Workspace Roadmap\n',
    '_control/AGENTS.md': `# KINI Workspace Rules\n\nKINI Core is public and resettable.\nPersonal preferences belong in profile/ and must not be hard-coded into Core.\n\n- Route work to a registered system before execution.\n- Apply profile preferences only after Core safety and architecture rules.\n- Keep unrelated products in separate Git repositories.\n- Use worktrees for parallel tasks in the same repository.\n- Never bypass a system's permission or quality rules.\n- Require human approval for destructive, paid, secret-dependent, or production-critical actions.\n`,
    '_control/rules/ROUTING.md': `# Routing\n\nCurrent built-in system:\n\n- software development / coding / app work → KINI Dev\n\nFuture systems may register their own intents and commands.\n`,
    '_control/rules/PROFILE.md': `# Profile Resolution\n\nKINI resolves instructions in this order:\n\n1. Core safety rules\n2. System rules\n3. Project rules\n4. User profile preferences\n\nA user profile may specialize defaults but must not weaken safety rules.\n`
  };
}

/**
 * 시스템 등록 정보.
 *
 * ⚠️ 내용을 여기 적지 않고 패키지에 실린 systems/devos/system.json 을 그대로
 * 씁니다. 예전에는 같은 목록이 코드와 파일 두 곳에 있어서, 한쪽에만 명령을
 * 더하면 워크스페이스에 옛 목록이 깔렸습니다. 새 시스템도 폴더만 추가하면
 * 되도록 원본을 파일 쪽에 둡니다.
 */
function systemRegistry(){
  const shipped=path.join(here,'..','systems','devos','system.json');
  try{ return JSON.parse(fs.readFileSync(shipped,'utf8')); }
  catch(e){ throw new Error(`시스템 등록 파일을 읽지 못했습니다: ${shipped}\n${e.message}`); }
}

const MANIFEST_REL='_control/.kini-managed.json';

/**
 * Core 문서를 최신 내용으로 맞춥니다.
 *
 * ⚠️ 예전에는 "파일이 없을 때만 쓴다" 였습니다. 그래서 KINI를 새로 받아도
 * 워크스페이스의 규칙 문서와 시스템 목록은 처음 설치한 날 버전에 영원히
 * 멈춰 있었습니다. 업그레이드가 조용히 아무 일도 안 하는 셈이라 알아채기
 * 어렵습니다.
 *
 * 그렇다고 덮어쓰기만 하면 사용자가 고친 규칙이 사라집니다. 그래서 KINI가
 * 마지막으로 써 준 내용의 해시를 manifest에 남겨 두고 셋으로 나눕니다.
 *
 *   - 지금 배포 내용과 같다        → 할 일 없음
 *   - KINI가 써 준 그대로다        → 새 내용으로 갱신
 *   - 사용자가 고쳤다              → 두고, 무엇을 안 건드렸는지 알려줌
 *
 * manifest가 아직 없던 시절에 설치한 워크스페이스는 판단할 근거가 없으므로
 * 갱신하되 backups/ 에 먼저 복사합니다. 조용히 날리지는 않습니다.
 */
function syncManagedFiles(h){
  const manifestPath=path.join(h,MANIFEST_REL);
  let prev={};
  let hadManifest=false;
  try{
    const parsed=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    prev=parsed.files||{};
    hadManifest=true;
  }catch{}

  const next={};
  const keptUserEdits=[];
  const updated=[];
  const backedUp=[];
  const backupRoot=path.join(h,'backups',`control-${stamp()}`);

  for(const [rel,content] of Object.entries(managedFiles())){
    const p=path.join(h,rel);
    next[rel]=sha(content);

    if(!exists(p)){
      ensure(path.dirname(p));
      fs.writeFileSync(p,content,'utf8');
      continue;
    }

    const current=fs.readFileSync(p,'utf8');
    if(sha(current)===next[rel]) continue;

    if(prev[rel]){
      if(sha(current)===prev[rel]){ fs.writeFileSync(p,content,'utf8'); updated.push(rel); }
      else keptUserEdits.push(rel);
      continue;
    }

    if(hadManifest){ keptUserEdits.push(rel); continue; }

    const backup=path.join(backupRoot,rel);
    ensure(path.dirname(backup));
    fs.copyFileSync(p,backup);
    fs.writeFileSync(p,content,'utf8');
    backedUp.push(rel);
  }

  ensure(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath,JSON.stringify({schemaVersion:1,version:KINI_VERSION,files:next},null,2),'utf8');

  return { updated, keptUserEdits, backedUp, backupRoot };
}

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

  const sync=syncManagedFiles(h);
  fs.writeFileSync(path.join(h,'systems','devos','system.json'), JSON.stringify(systemRegistry(),null,2)+'\n','utf8');

  console.log(`✓ KINI workspace initialized: ${h}`);
  console.log('✓ Personal profile ready: profile/');
  console.log('✓ Built-in system: KINI Dev');

  if(sync.updated.length) console.log(`✓ 최신 규칙 문서로 갱신: ${sync.updated.join(', ')}`);
  if(sync.backedUp.length){
    console.log(`✓ 이전 규칙 문서 백업 후 갱신: ${sync.backedUp.join(', ')}`);
    console.log(`  백업 위치: ${sync.backupRoot}`);
  }
  if(sync.keptUserEdits.length){
    console.log(`! 직접 고친 문서라 그대로 두었습니다: ${sync.keptUserEdits.join(', ')}`);
    console.log('  최신 내용으로 되돌리려면 해당 파일을 지우고 kini init을 다시 실행하세요.');
  }
}
function doctor(){
  banner();
  // ⚠️ 코딩 에이전트는 여러 개 중 **하나만 있으면 됩니다.** 예전에는 Codex 만
  // 확인해서, Claude 를 쓰는 사람에게는 멀쩡한 환경이 "missing" 으로 보였습니다.
  console.log(`${has('git')?'✓':'!'} Git${has('git')?'':'  (필수)'}`);
  /**
   * Node 는 "있느냐" 가 아니라 "버전이 되느냐" 를 봅니다. 옛 Node 로도 doctor 가
   * ✓ 를 찍고 정작 쓸 때 터지면 그건 진단이 아닙니다.
   */
  const nodeMajor=Number(process.versions.node.split('.')[0]);
  const nodeOk=nodeMajor>=NODE_MAJOR_REQUIRED;
  console.log(`${nodeOk?'✓':'!'} Node.js  v${process.versions.node}${nodeOk?'':`  (v${NODE_MAJOR_REQUIRED} 이상 필요)`}`);
  console.log(`${has('npm')?'✓':'!'} npm${has('npm')?'':'  (필수)'}`);
  // pnpm 은 없어도 KINI 가 돌아갑니다. 필수처럼 보이지 않게 표시합니다.
  console.log(`${has('pnpm')?'✓':'·'} pnpm${has('pnpm')?'':'  (선택)'}`);
  // 목록은 KINI Dev 와 같은 것을 봅니다. profile 로 더한 에이전트도 여기 나옵니다.
  const agents=loadAgents(home()).filter(a=>has(a.cmd));
  console.log(`${agents.length?'✓':'!'} 코딩 에이전트${agents.length?`  ${agents.map(a=>a.label||a.id).join(', ')}`:'  (없음 - kini dev agent list)'}`);
  console.log(`\nKINI_HOME  ${home()}`);
  console.log(`Workspace  ${exists(home())?'ready':'not initialized'}`);
  console.log(`Profile    ${exists(path.join(home(),'profile'))?'ready':'not initialized'}`);
  console.log('\nSystems');
  for(const s of allSystems()) console.log(` ${s.status==='built-in'?'✓':'·'} ${s.name.padEnd(15)} ${s.status}`);
}
function listSystems(){
  banner();
  console.log('등록된 시스템\n');
  for(const s of allSystems()){
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
  console.log(`처음 시작하기\n  kini init\n  kini doctor\n  kini systems\n\n개인 설정\n  kini profile show\n  kini profile export ./my-kini-profile\n  kini profile import ./my-kini-profile\n  kini profile reset --dry-run\n\n소프트웨어 개발\n  kini dev new "만들고 싶은 앱"\n  kini dev status\n  kini dev worktree new <기능명>\n  kini dev agent\n\n빠른 시작\n  kini "타임라인 앱 만들어볼까?"\n\nKINI Core는 공통으로 유지되고, 개인화는 ~/kini/profile/에 저장됩니다.\n`);
}
const RESERVED=['init','doctor','systems','profile','dev','devos','help','--help','-h','--version','version'];
/**
 * 첫 인자를 "만들고 싶은 것" 으로 볼지.
 *
 * ⚠️ `-` 로 시작하는 것은 아이디어가 아니라 오타난 옵션입니다. 예전에는
 * `kini --verbose` 같은 입력이 새 프로젝트 마법사를 열었습니다.
 */
function looksLikeIdea(args){
  if(args.length===0) return false;
  const first=args[0]||'';
  if(first.startsWith('-')) return false;
  return !RESERVED.includes(first);
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
  } else {
    console.log(`\n모르는 명령입니다: ${cmd}`);
    help();
    process.exitCode=1;
  }
}catch(e){
  console.error(`\nERROR ${e.message}`);
  process.exitCode=1;
}
