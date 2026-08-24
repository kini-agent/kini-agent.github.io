import fs from 'node:fs';
import path from 'node:path';
import { runDevOS as runBaseDevOS } from './devos.mjs';
import { buildProfileContext, ensureProfile } from '../profile.mjs';

const exists=p=>fs.existsSync(p);

function projectRoot(){
  let p=process.cwd();
  while(true){
    if(exists(path.join(p,'.kini','dev','project.json')) || exists(path.join(p,'.devos','project.json'))) return p;
    const q=path.dirname(p);
    if(q===p) return null;
    p=q;
  }
}

function syncProfile(root,kiniHome){
  if(!root) return;
  ensureProfile(kiniHome);
  const contextDir=path.join(root,'.kini');
  fs.mkdirSync(contextDir,{recursive:true});
  const contextPath=path.join(contextDir,'KINI_PROFILE.md');
  fs.writeFileSync(contextPath,buildProfileContext(kiniHome),'utf8');

  const agentsPath=path.join(root,'AGENTS.md');
  const note='- 작업 시작 전에 .kini/KINI_PROFILE.md를 읽고 개인 선호를 적용합니다. 단, Core/프로젝트의 안전 규칙이 항상 우선합니다.';
  if(exists(agentsPath)){
    const current=fs.readFileSync(agentsPath,'utf8');
    if(!current.includes('.kini/KINI_PROFILE.md')) fs.appendFileSync(agentsPath,`\n${note}\n`,'utf8');
  }
}

export async function runDevOS(args,{kiniHome}){
  const [cmd]=args;

  if(cmd==='codex' || cmd==='status'){
    const root=projectRoot();
    if(root) syncProfile(root,kiniHome);
  }

  await runBaseDevOS(args,{kiniHome});

  // 새 프로젝트 생성이 끝난 직후에는 현재 작업 디렉터리가 프로젝트가 아닐 수 있으므로
  // Profile은 첫 status/codex 실행 시 자동으로 동기화됩니다.
}
