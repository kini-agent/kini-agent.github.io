import fs from 'node:fs';
import path from 'node:path';
import { runDevOS as runBaseDevOS } from './devos.mjs';
import { buildProfileContext, ensureProfile } from '../profile.mjs';

const exists=p=>fs.existsSync(p);

/**
 * 에이전트를 바로 여는 하위 명령들. `devos.mjs` 의 목록과 어긋나면 프로필이
 * 안 실리므로, 새 에이전트를 더할 때 여기도 같이 본다.
 */
const AGENT_COMMANDS=new Set(['claude','codex']);

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

  /**
   * ⚠️ 에이전트를 띄우기 **전에** 프로필을 내려놔야 합니다. 예전에는 `codex`
   * 라는 이름만 봤기 때문에 다른 에이전트로 시작하면 개인 설정이 반영되지
   * 않은 채로 돌았습니다. 조용히 틀리는 부류라 이름을 늘리지 않고 "에이전트를
   * 여는 명령이면 전부" 로 바꿉니다.
   */
  const opensAgent = cmd==='agent' || cmd==='status' || AGENT_COMMANDS.has(cmd);
  if(opensAgent){
    const root=projectRoot();
    if(root) syncProfile(root,kiniHome);
  }

  await runBaseDevOS(args,{kiniHome});

  // 새 프로젝트 생성이 끝난 직후에는 현재 작업 디렉터리가 프로젝트가 아닐 수 있으므로
  // Profile은 첫 status/codex 실행 시 자동으로 동기화됩니다.
}
