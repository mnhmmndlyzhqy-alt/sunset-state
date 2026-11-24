'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const output = path.join(__dirname, 'SHADER_AUDIT_REPORT.md');
function blank(s) { return s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, m => m.replace(/[^\n]/g, ' ')); }
function line(s, i) { return 1 + (s.slice(0, i).match(/\n/g) || []).length; }
function endPair(s, start, open, close) { let depth = 0; for (let i = start; i < s.length; i++) { if (s[i] === open) depth++; else if (s[i] === close && --depth === 0) return i; } return -1; }
function codeQuote(s) { return '`' + s.replace(/`/g, "'").replace(/\s+/g, ' ').trim() + '`'; }
try {
  const files = ['engine44.js', ...fs.readdirSync(path.join(root, 'assets'), {withFileTypes:true}).filter(d => d.isFile() && /\.js$/i.test(d.name) && !/\.(original|stage19|stage35_original)$/i.test(d.name)).map(d => 'assets/' + d.name).sort()];
  const sources = files.map(file => ({file, text:fs.readFileSync(path.join(root, file), 'utf8')}));
  const templates = [];
  for (const src of sources) {
    // Template literals containing GLSL; retain source positions for shared snippets too.
    const re = /`(?:\\[\s\S]|[^`])*`/g; let m;
    while ((m = re.exec(src.text))) {
      const prefix = src.text.slice(Math.max(0, m.index - 100), m.index);
      const named = /(?:const|let|var)\s+(\w+)\s*=\s*$/.exec(prefix);
      templates.push({file:src.file, start:m.index + 1, body:m[0].slice(1,-1), name:named && named[1], source:src.text});
    }
  }
  const shared = Object.fromEntries(templates.filter(t => t.file === 'assets/stage39_realism_render.js' && ['RC_UNIFORMS','RC_FUNCS'].includes(t.name)).map(t => [t.name,t]));
  const shaders = templates.filter(t => /#version\s+300\b|\bgl_Position\b|\bgl_FragColor\b/.test(t.body) && /\bvoid\s+main\s*\(/.test(t.body));
  const report = ['# Shader audit', '', `Scanned ${files.length} JavaScript files: engine44.js and JavaScript files directly in assets/. Found ${shaders.length} shader templates.`, '', 'Static source audit; not a GPU profile. Template variants count once. Shared RC_UNIFORMS and RC_FUNCS are expanded where referenced; other interpolations and runtime shader patches are not evaluated. Counts and unused-uniform results can therefore be incomplete, and conditional compilation is not evaluated. Loop call findings are lexical: calls hidden inside helper functions are not attributed to callers. Unresolved loop bounds are candidates, not proof of runtime variability.', ''];
  let fragments = 0, loopCalls = 0, dynamic = 0;
  for (const t of shaders) {
    let text = '', origins = [], unresolved = [];
    function append(value, owner, offset) { text += value; for (let i=0;i<value.length;i++) origins.push({file:owner.file, line:line(owner.source, owner.start + offset + i)}); }
    const re = /\$\{([^{}]*)\}/g; let m, last=0;
    while ((m = re.exec(t.body))) {
      append(t.body.slice(last,m.index),t,last);
      const key = {'RC.GLSL.uniforms':'RC_UNIFORMS','RC.GLSL.funcs':'RC_FUNCS'}[m[1].trim()] || m[1].trim();
      if (shared[key]) append(shared[key].body,shared[key],0);
      else { unresolved.push(m[1].trim()); append(m[0].replace(/[^\n]/g,' '),t,m.index); }
      last = re.lastIndex;
    }
    append(t.body.slice(last),t,last);
    const clean = blank(text), loc = i => { const p=origins[i] || {file:t.file,line:line(t.source,t.start)}; return `${p.file}:${p.line}`; };
    const startLine = line(t.source,t.start), fragment = !/\bgl_Position\b/.test(clean) && (/\b(?:out\s+vec4|gl_FragColor|gl_FragDepth)\b/.test(clean) || /(?:FS|FRAG|fragment)/i.test(t.name || t.source.slice(Math.max(0,t.start-100),t.start)));
    if (fragment) fragments++;
    const version = /#\s*version\s+([^\n]+)/.exec(clean);
    report.push(`## ${t.file}:${startLine} — ${fragment ? 'fragment' : 'vertex/unknown'}${t.name ? ' ('+t.name+')' : ''}`, '', `- Version: ${version ? codeQuote(version[1]) + ' at ' + loc(version.index) : 'not found'}.`);
    if (fragment) { const p=/\bprecision\s+(lowp|mediump|highp)\s+float\s*;/.exec(clean); report.push(`- Default float precision: ${p ? p[1]+' at '+loc(p.index) : 'not declared in visible source'}.`); }
    const decls = [], unire = /\buniform\s+(?:(?:lowp|mediump|highp)\s+)?(\w+)\s+([^;]+);/g; let u;
    while ((u=unire.exec(clean))) for (const part of u[2].split(',')) { const nm=/^\s*(\w+)/.exec(part); if(nm) decls.push({name:nm[1],type:u[1],index:u.index,end:unire.lastIndex}); }
    const without = clean.replace(unire, x => x.replace(/[^\n]/g,' '));
    const unused = decls.filter(d => !new RegExp('\\b'+d.name+'\\b').test(without));
    report.push(`- Unused declared uniforms: ${unused.length ? unused.map(d=>codeQuote(d.name)+' ('+loc(d.index)+')').join(', ') : 'none detected'}.`);
    if(fragment) { const samplers=decls.filter(d=>/^(?:[iu]?sampler)/.test(d.type)); report.push(`- Sampler uniforms: ${samplers.length}${samplers.length ? ' ('+samplers.map(d=>d.name+' at '+loc(d.index)).join(', ')+')' : ''}.`); const highs=[...clean.matchAll(/\bhighp\b/g)]; report.push(`- Fragment highp: ${highs.length ? highs.map(x=>loc(x.index)).join(', ')+' (review for mediump where precision permits)' : 'none explicitly declared'}.`); }
    const constants = new Set([...clean.matchAll(/\bconst\s+(?:int|uint|float)\s+(\w+)\s*=\s*[^;]+;/g)].map(x=>x[1]));
    const macros = new Set([...clean.matchAll(/^\s*#\s*define\s+(\w+)\s+[-+\d.]+\s*$/gm)].map(x=>x[1]));
    const loops=[]; const lr=/\b(for|while|do)\b/g; let lm;
    while ((lm=lr.exec(clean))) {
      let pos=lr.lastIndex, head='', bodyStart;
      while (/\s/.test(clean[pos] || '')) pos++;
      if(lm[1] !== 'do') { if(clean[pos] !== '(') continue; const e=endPair(clean,pos,'(',')'); if(e<0) continue; head=clean.slice(pos+1,e); bodyStart=e+1; } else bodyStart=pos;
      while (/\s/.test(clean[bodyStart] || '')) bodyStart++;
      let end=clean[bodyStart]==='{' ? endPair(clean,bodyStart,'{','}') : clean.indexOf(';',bodyStart); if(end<0) end=bodyStart;
      let isDynamic = true;
      if(lm[1]==='for') { const parts=head.split(';'); const cond=parts[1] || ''; const cmp=/(?:<=|>=|<|>)\s*([^&|]+?)(?:\s*$)/.exec(cond); if(cmp) { let bound=cmp[1].trim(); bound=bound.replace(/\b[A-Za-z_]\w*\b/g, word => constants.has(word)||macros.has(word) ? '1' : word); isDynamic=!/^[\d.\s()+*\/-]+$/.test(bound); } }
      const calls=[...clean.slice(bodyStart,end+1).matchAll(/\b(pow|exp|exp2|log|log2|sin|cos|normalize|texture\w*|texelFetch\w*)\s*\(/g)].map(x=>({name:x[1],where:loc(bodyStart+x.index)}));
      loops.push({where:loc(lm.index),head:lm[1]+'('+head+')',isDynamic,calls});
    }
    const dyn=loops.filter(x=>x.isDynamic); dynamic+=dyn.length; loopCalls+=loops.reduce((n,l)=>n+l.calls.length,0);
    report.push(`- Loops with nonconstant or unresolved bounds: ${dyn.length ? dyn.map(l=>codeQuote(l.head)+' at '+l.where).join('; ') : 'none detected'}.`);
    const costly=loops.filter(l=>l.calls.length); report.push(`- Expensive calls inside loops: ${costly.length ? costly.map(l=>codeQuote(l.head)+' at '+l.where+': '+l.calls.map(c=>c.name+' at '+c.where).join(', ')).join('; ') : 'none detected'}.`);
    if(unresolved.length) report.push(`- Unresolved JavaScript interpolations: ${[...new Set(unresolved)].map(codeQuote).join(', ')}.`);
    report.push('');
  }
  report.splice(4,0,`Summary: ${fragments} fragment shaders; ${dynamic} loops with nonconstant or unresolved bounds; ${loopCalls} lexical expensive-call occurrences in loops (nested loops may repeat occurrences).`,'');
  fs.writeFileSync(output,report.join('\n')+'\n','utf8');
  console.log(`Shader audit: ${shaders.length} shaders (${fragments} fragment); ${dynamic} nonconstant/unresolved loops; ${loopCalls} expensive calls in loops. Report: QA/SHADER_AUDIT_REPORT.md`);
} catch (e) { console.error('Shader audit failed:',e.message); process.exitCode=1; }
