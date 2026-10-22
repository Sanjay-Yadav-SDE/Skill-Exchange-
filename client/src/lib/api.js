const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
let csrfToken = '';
export async function request(path, options={}) {
  const method = (options.method || 'GET').toUpperCase();
  if (!['GET','HEAD','OPTIONS'].includes(method) && !csrfToken) {
    const tokenRes = await fetch(`${API}/csrf-token`, { credentials:'include' });
    const tokenData = await tokenRes.json(); csrfToken = tokenData.csrfToken || '';
  }
  const res = await fetch(`${API}${path}`, { credentials:'include', ...options, headers:{ 'Content-Type':'application/json', ...(csrfToken ? {'X-CSRF-Token':csrfToken} : {}), ...(options.headers||{}) } });
  const data = await res.json().catch(()=>({}));
  if (!res.ok) { if (res.status === 403 && String(data.error||'').includes('security token')) csrfToken=''; throw new Error(data.error || 'Request failed'); }
  return data;
}
export const api = {
  me:()=>request('/auth/me'), register:async(data)=>{const out=await request('/auth/register',{method:'POST',body:JSON.stringify(data)});csrfToken='';return out},
  login:async(data)=>{const out=await request('/auth/login',{method:'POST',body:JSON.stringify(data)});csrfToken='';return out}, logout:()=>request('/auth/logout',{method:'POST',body:'{}'}),
  profile:(data)=>request('/auth/profile',{method:'PATCH',body:JSON.stringify(data)}), people:(q='')=>request(`/people${q?`?q=${encodeURIComponent(q)}`:''}`),
  dashboard:()=>request('/people/dashboard'), exchange:(data)=>request('/people/exchanges',{method:'POST',body:JSON.stringify(data)}),
  status:(id,status)=>request(`/people/exchanges/${id}/status`,{method:'PATCH',body:JSON.stringify({status})}),
  review:(data)=>request('/people/reviews',{method:'POST',body:JSON.stringify(data)})
};
