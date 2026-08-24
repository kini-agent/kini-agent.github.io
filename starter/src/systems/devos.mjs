import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { spawnSync } from 'node:child_process';

const ensure=p=>fs.mkdirSync(p,{recursive:true});
const exists=p=>fs.existsSync(p);
const run=(cmd,args=[],opts={})=>spawnSync(cmd,args,{encoding:'utf8',shell:process.platform==='win32',...opts});
const has=cmd=>(process.platform==='win32'?run('where',[cmd]):run('which',[cmd])).status===0;
const slug=s=>String(s||'').trim().toLowerCase().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'')||'project';

/**
 * 쓸 수 있는 코딩 에이전트 목록.
 *
 * 예전에는 `codex` 하나가 코드에 박혀 있어서 다른 모델을 쓰는 사람은 이 명령을
 * 아예 못 썼습니다. 하는 일이 "프로젝트 폴더에서 CLI 를 띄운다" 뿐이라
 * 특정 회사에 묶일 이유가 없습니다.
 *
 * 여기 없는 도구는 profile 에서 더할 수 있습니다 (아래 loadAgents 참고).
 */
const BUILTIN_AGENTS=[
  {id:'claude',label:'Claude Code',cmd:'claude',install:'npm install -g @anthropic-ai/claude-code'},
  {id:'codex', label:'Codex CLI',  cmd:'codex', install:'npm install -g @openai/codex'},
];

/**
 * profile/AGENTS.json 이 있으면 목록에 더합니다. 같은 id 면 profile 쪽이 이깁니다.
 * 파일이 깨져 있어도 명령이 죽지 않게 조용히 무시합니다 - 이건 편의 기능이지
 * 없으면 안 되는 것이 아닙니다.
 */
function loadAgents(kiniHome){
  const extra=[];
  try{
    const f=path.join(kiniHome||'','profile','AGENTS.json');
    if(exists(f)){
      const j=JSON.parse(fs.readFileSync(f,'utf8'));
      if(Array.isArray(j)) for(const a of j) if(a&&a.id&&a.cmd) extra.push(a);
    }
  }catch{}
  const byId=new Map(BUILTIN_AGENTS.map(a=>[a.id,a]));
  for(const a of extra) byId.set(a.id,{...byId.get(a.id),...a});
  return [...byId.values()];
}

/** 설치돼 있는 것만. 순서는 목록 순서를 따릅니다. */
const installedAgents=list=>list.filter(a=>has(a.cmd));

/**
 * 어떤 것을 쓸지.
 * 1) 인자로 지정한 것  2) KINI_AGENT 환경변수  3) 설치된 것 중 첫 번째
 *
 * ⚠️ 지정했는데 안 깔려 있으면 **다른 것으로 몰래 바꾸지 않습니다.** 사용자가
 * 고른 것과 다른 모델이 뜨는 편이 안 뜨는 것보다 나쁩니다.
 */
function pickAgent(list,wanted){
  const want=wanted||process.env.KINI_AGENT;
  if(want){
    const hit=list.find(a=>a.id===want||a.cmd===want);
    // ⚠️ 목록에 있는 것과 깔려 있는 것은 다릅니다. 여기서 has() 를 안 보면
    // 없는 CLI 를 spawn 해서 "실행" 이라고 찍고 아무 일도 안 일어납니다.
    return {agent:hit&&has(hit.cmd)?hit:null,explicit:true,want};
  }
  return {agent:installedAgents(list)[0]||null,explicit:false,want:null};
}

function header(){ console.log('\nKINI Dev  소프트웨어 개발 시스템\n'); }
async function ask(rl,label,def=''){const v=(await rl.question(`${label}${def?` [${def}]`:''}: `)).trim();return v||def;}
async function choose(rl,label,items,def=0){
  console.log(`\n${label}`);
  items.forEach((x,i)=>console.log(` ${i===def?'›':' '} ${i+1}. ${x[0]}`));
  while(true){
    const r=(await rl.question(`선택 [${def+1}]: `)).trim();
    const n=r===''?def:Number(r)-1;
    if(Number.isInteger(n)&&n>=0&&n<items.length)return items[n][1];
  }
}
function projectRoot(){
  let p=process.cwd();
  while(true){
    if(exists(path.join(p,'.kini','dev','project.json')) || exists(path.join(p,'.devos','project.json'))) return p;
    const q=path.dirname(p); if(q===p)return null; p=q;
  }
}
function projectMeta(root){
  const modern=path.join(root,'.kini','dev','project.json');
  const legacy=path.join(root,'.devos','project.json');
  return JSON.parse(fs.readFileSync(exists(modern)?modern:legacy,'utf8'));
}
function devDoctor(kiniHome){
  header();
  console.log(`KINI workspace: ${kiniHome}`);
  console.log(`Projects: ${path.join(kiniHome,'projects')}`);
  console.log(`Worktrees: ${path.join(kiniHome,'worktrees')}`);
  console.log(`Git: ${has('git')?'ready':'missing'}`);
  for(const a of loadAgents(kiniHome)) console.log(`${a.label}: ${has(a.cmd)?'ready':'missing'}`);
}
async function newProject(ideaArg,kiniHome){
  header();
  const rl=readline.createInterface({input,output});
  try{
    const idea=ideaArg||await ask(rl,'무엇을 만들어볼까요?');
    const s=slug(await ask(rl,'프로젝트 폴더명',slug(idea).slice(0,36)));
    const name=await ask(rl,'프로젝트 이름',s);
    const mode=await choose(rl,'개발 모드',[['Quick — 빠른 실험','quick'],['Standard — 일반 프로젝트','standard'],['Strict — 결정이 부족하면 시작하지 않음','strict'],['Production — 운영 배포 기준','production']],1);
    const language=await choose(rl,'주 언어',[['TypeScript','typescript'],['Java','java'],['Python','python'],['Rust','rust'],['C# / .NET','dotnet'],['Go','go']],0);
    const platform=await choose(rl,'어디에서 사용할까요?',[['Web','web'],['Mobile','mobile'],['Desktop','desktop'],['Web + Mobile','web+mobile'],['여러 플랫폼','multi']],0);
    const autonomy=await choose(rl,'AI가 어디까지 스스로 진행해도 될까요?',[['Assisted — 큰 작업 전 확인','assisted'],['Standard — Milestone 단위 확인','standard'],['Autonomous — 위험 작업 외 자동 진행','autonomous']],1);
    const user=await ask(rl,'이 제품을 주로 누가 사용하나요?','일반 사용자');
    const problem=await ask(rl,'사용자의 어떤 문제를 해결하나요?');
    const mvp=await ask(rl,'첫 버전에 꼭 필요한 기능은? (쉼표로 구분)');
    const db=await choose(rl,'데이터는 어디에 저장할까요?',[['PostgreSQL','postgresql'],['SQLite','sqlite'],['기기/로컬 저장','local'],['아직 결정하지 않음','undecided']],0);

    const missing=[];
    if(!idea)missing.push('만들고 싶은 제품');
    if(!problem)missing.push('해결하려는 문제');
    if(!mvp)missing.push('첫 버전 핵심 기능');
    if(['strict','production'].includes(mode)&&db==='undecided')missing.push('데이터 저장 방식');
    if(missing.length){
      console.log('\n아직 개발을 시작하기 어렵습니다.');
      for(const x of missing) console.log(`! ${x}`);
      console.log('\n위 항목을 결정한 뒤 다시 실행해주세요.');
      return;
    }

    const root=path.join(kiniHome,'projects',s);
    if(exists(root))throw new Error(`이미 같은 프로젝트 폴더가 있습니다: ${root}`);
    ensure(path.join(root,'docs'));
    ensure(path.join(root,'planning'));
    ensure(path.join(root,'.kini','dev'));

    fs.writeFileSync(path.join(root,'AGENTS.md'),`# ${name} — AI 작업 규칙\n\n이 프로젝트는 KINI Dev가 관리합니다.\n\n## 작업 원칙\n- docs/SPEC.md와 docs/DEFINITION_OF_DONE.md를 먼저 읽습니다.\n- UI나 Agent가 DB를 직접 수정하지 않습니다.\n- Tool → Service → Core 순서를 지킵니다.\n- 구현 → 테스트 → 스스로 검토 → 수정 → 다시 검증합니다.\n- 삭제, 비용 발생, Secret 필요, 운영 배포처럼 위험한 결정은 사용자 확인을 받습니다.\n`);
    fs.writeFileSync(path.join(root,'docs','PRODUCT.md'),`# 제품 설명\n\n## 만들고 싶은 것\n${idea}\n\n## 주요 사용자\n${user}\n\n## 해결하려는 문제\n${problem}\n`);
    fs.writeFileSync(path.join(root,'docs','SPEC.md'),`# 기능 요구사항\n\n## 첫 버전 핵심 기능\n${mvp}\n\n## 플랫폼\n${platform}\n\n## 주 언어\n${language}\n\n## 데이터 저장\n${db}\n`);
    fs.writeFileSync(path.join(root,'docs','ARCHITECTURE.md'),`# 프로그램 구조\n\n화면 / CLI / MCP / AI\n        ↓\n      Tool\n        ↓\n     Service\n        ↓\n      Core\n        ↓\n Repository / DB\n`);
    fs.writeFileSync(path.join(root,'docs','CAPABILITIES.md'),`# AI가 사용할 수 있는 기능\n\nAI가 직접 DB나 인프라를 건드리지 않도록, 작은 기능 단위의 Tool을 여기에 정리합니다.\n\n예:\n- create_task\n- list_tasks\n- complete_task\n`);
    fs.writeFileSync(path.join(root,'docs','DEFINITION_OF_DONE.md'),`# 완료 조건\n\n기능이 끝났다고 판단하기 전에 확인합니다.\n\n- [ ] 빌드 성공\n- [ ] 타입/린트 오류 없음\n- [ ] 관련 테스트 통과\n- [ ] 로딩/빈 화면/오류 상황 처리\n- [ ] 권한과 보안 확인\n- [ ] 문서와 실제 코드가 일치\n- [ ] AI가 변경사항을 한 번 더 스스로 검토\n`);
    fs.writeFileSync(path.join(root,'planning','ROADMAP.md'),`# 개발 순서\n\n- [ ] M1. 기본 구조와 데이터 모델\n- [ ] M2. 핵심 기능\n- [ ] M3. 완성도 개선과 출시 점검\n`);
    fs.writeFileSync(path.join(root,'planning','CURRENT.md'),`# 현재 상태\n\n상태: 개발 준비 완료\n다음 작업: M1 세부 계획 만들기\n`);
    fs.writeFileSync(path.join(root,'planning','DECISIONS.md'),'# 중요한 결정 기록\n');
    fs.writeFileSync(path.join(root,'.kini','dev','project.json'),JSON.stringify({schemaVersion:1,system:'devos',name,slug:s,idea,mode,language,platform,autonomy,targetUser:user,coreProblem:problem,mvp,database:db},null,2));
    fs.writeFileSync(path.join(root,'.gitignore'),'node_modules/\n.env\n.env.*\ndist/\nbuild/\n.DS_Store\n');

    if(has('git')) run('git',['init'],{cwd:root});
    const projectList=path.join(kiniHome,'_control','PROJECTS.md');
    if(exists(projectList)) fs.appendFileSync(projectList,`- [ ] ${name} — KINI Dev — ${mode} — ${language}\n`);

    console.log('\n준비 완료 ✓\n');
    console.log(`프로젝트 폴더: ${root}`);
    console.log('\n다음 명령을 실행하세요.');
    console.log(`cd "${root}"`);
    console.log('kini dev status');
    console.log('kini dev codex');
  } finally { rl.close(); }
}
function status(){
  header();
  const root=projectRoot();
  if(!root){console.log('KINI Dev 프로젝트 폴더 안에서 실행해주세요.');return;}
  const c=projectMeta(root);
  console.log(`${c.name}`);
  console.log(`위치: ${root}`);
  console.log(`언어: ${c.language}`);
  console.log(`개발 모드: ${c.mode}`);
  console.log(`AI 자율성: ${c.autonomy}`);
  const cur=path.join(root,'planning','CURRENT.md');
  if(exists(cur))console.log('\n'+fs.readFileSync(cur,'utf8'));
}
function worktree(name,kiniHome){
  header();
  const root=projectRoot();
  if(!root)throw new Error('KINI Dev 프로젝트 폴더 안에서 실행해주세요.');
  if(!has('git'))throw new Error('Git이 필요합니다.');
  const n=slug(name);
  if(!n)throw new Error('기능 이름을 입력해주세요.');
  const target=path.join(kiniHome,'worktrees',path.basename(root),n);
  const branch=`feat/${n}`;
  ensure(path.dirname(target));
  const x=run('git',['worktree','add',target,'-b',branch],{cwd:root});
  if(x.status!==0)throw new Error(x.stderr||x.stdout);
  console.log(`✓ 작업 폴더: ${target}`);
  console.log(`✓ Git branch: ${branch}`);
  console.log(`\ncd "${target}"`);
  console.log('kini dev agent');
}
function agentList(kiniHome){
  header();
  const list=loadAgents(kiniHome);
  console.log('코딩 에이전트');
  for(const a of list) console.log(`${has(a.cmd)?'✓':'!'} ${a.label.padEnd(14)} ${a.cmd}${has(a.cmd)?'':`   설치: ${a.install||'-'}`}`);
  const {agent}=pickAgent(list);
  console.log(`\n기본값: ${agent?agent.label:'(설치된 것 없음)'}`);
  console.log('바꾸기: KINI_AGENT=claude kini dev agent');
  console.log('더하기: ~/kini/profile/AGENTS.json 에 {id,label,cmd,install} 배열');
}

function agent(wanted,kiniHome){
  header();
  const list=loadAgents(kiniHome);
  const {agent:picked,explicit,want}=pickAgent(list,wanted);
  if(!picked){
    if(explicit){
      // 이름은 아는데 안 깔린 경우와, 이름 자체를 모르는 경우를 갈라 말해줍니다.
      const known=list.find(a=>a.id===want||a.cmd===want);
      if(known){ console.log(`${known.label}가 없습니다.`); console.log(`설치: ${known.install||known.cmd}`); }
      else console.log(`모르는 에이전트입니다: ${want}\n사용 가능: ${list.map(a=>a.id).join(', ')}`);
    }else{
      console.log('코딩 에이전트가 하나도 없습니다.');
      for(const a of list) console.log(`  ${a.label}: ${a.install||a.cmd}`);
    }
    return;
  }
  console.log(`${picked.label} 실행\n`);
  spawnSync(picked.cmd,[],{cwd:projectRoot()||process.cwd(),stdio:'inherit',shell:process.platform==='win32'});
}
function help(){
  header();
  console.log(`kini dev doctor\nkini dev new [아이디어]\nkini dev status\nkini dev worktree new <기능명>\nkini dev agent          설치된 에이전트로 시작\nkini dev agent list     무엇을 쓸 수 있는지\nkini dev claude         특정 에이전트 지정\nkini dev codex          (같음 - 예전 이름도 그대로 됩니다)`);
}

export async function runDevOS(args,{kiniHome}){
  const [cmd,...rest]=args;
  if(!cmd || cmd==='help' || cmd==='--help' || cmd==='-h') help();
  else if(cmd==='doctor') devDoctor(kiniHome);
  else if(cmd==='new') await newProject(rest.join(' '),kiniHome);
  else if(cmd==='status') status();
  else if(cmd==='worktree'&&rest[0]==='new') worktree(rest.slice(1).join('-'),kiniHome);
  // ⚠️ `codex` 는 예전부터 쓰던 이름이라 그대로 둡니다. 문서와 습관에 남아
  // 있는 명령을 없애면 고치는 김에 남의 흐름을 끊게 됩니다.
  else if(cmd==='agent'&&rest[0]==='list') agentList(kiniHome);
  else if(cmd==='agent') agent(rest[0],kiniHome);
  else if(loadAgents(kiniHome).some(a=>a.id===cmd||a.cmd===cmd)) agent(cmd,kiniHome);
  else help();
}
