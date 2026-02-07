
import React from 'react';
import { User, Role, Client } from '../types';

interface UserManagerProps {
  users: User[];
  clients: Client[];
  onAdd: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, updates: Partial<User>) => void;
  onRemove: (id: string) => void;
}

const UserManager: React.FC<UserManagerProps> = ({ users, clients, onAdd, onUpdate, onRemove }) => {
  const [isAdding, setIsAdding] = React.useState(false);
  const [form, setForm] = React.useState({ name: '', email: '', role: Role.ADMIN, clientId: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    if (form.role === Role.CLIENT && !form.clientId) {
      alert("Debes asociar una marca para el rol Cliente.");
      return;
    }
    onAdd(form);
    setForm({ name: '', email: '', role: Role.ADMIN, clientId: '' });
    setIsAdding(false);
  };

  const tableHeaderStyle = "px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]";
  const inputStyle = "px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:border-orange-400 text-sm";

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Equipo & <span className="text-gradient">Control</span></h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Access Management Console</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">
          {isAdding ? 'CANCELAR ACCIÓN' : 'AÑADIR NUEVO ACCESO'}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 animate-in slide-in-from-top-6 duration-500">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre Completo</label>
                <input required type="text" placeholder="Ej: Juan Pérez" className={inputStyle} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Email Corporativo</label>
                <input required type="email" placeholder="email@dominio.com" className={inputStyle} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 ml-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rol en Sistema</label>
                  <div className="group relative">
                    <svg className="w-3.5 h-3.5 text-slate-300 cursor-help hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-5 bg-slate-900 text-white text-[10px] rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 transform group-hover:translate-y-0 translate-y-2 scale-95 group-hover:scale-100">
                      <p className="font-black text-orange-500 uppercase mb-3 border-b border-white/10 pb-2 tracking-widest">Niveles de Privilegio</p>
                      <div className="space-y-3">
                        <p className="leading-relaxed">
                          <span className="text-white font-black block mb-1">⚡ ADMIN (Grupo LoBueno):</span> 
                          Acceso total a generación IA, gestión de marcas, ADN estratégico y configuración de equipo.
                        </p>
                        <p className="leading-relaxed">
                          <span className="text-white font-black block mb-1">👤 CLIENTE (Externo):</span> 
                          Acceso restringido. Solo visualización y aprobación de contenidos de su marca asociada.
                        </p>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                </div>
                <select className={inputStyle} value={form.role} onChange={e => setForm({...form, role: e.target.value as Role, clientId: e.target.value === Role.ADMIN ? '' : form.clientId})}>
                  <option value={Role.ADMIN}>Admin (Grupo LoBueno)</option>
                  <option value={Role.CLIENT}>Cliente (Externo)</option>
                </select>
              </div>
              
              {form.role === Role.CLIENT ? (
                <div className="flex flex-col gap-2 animate-in zoom-in-95 duration-300">
                  <label className="text-[9px] font-black text-orange-500 uppercase tracking-widest ml-4">Asociar a Marca</label>
                  <select required className={inputStyle + " border-orange-200 bg-orange-50/30"} value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}>
                    <option value="">Seleccionar Marca...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <button type="submit" className="accent-gradient text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 text-[10px]">CREAR CREDENCIAL</button>
              )}
            </div>

            {form.role === Role.CLIENT && (
              <div className="flex justify-end">
                <button type="submit" className="w-full lg:w-1/4 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg text-[10px]">CREAR ACCESO CLIENTE</button>
              </div>
            )}
          </form>
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/40 border border-slate-100 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-50">
          <thead className="bg-slate-50/50">
            <tr>
              <th className={tableHeaderStyle}>Identidad</th>
              <th className={tableHeaderStyle}>Rol / Privilegios</th>
              <th className={tableHeaderStyle}>Asociación de Marca</th>
              <th className={tableHeaderStyle + " text-center"}>Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${u.role === Role.ADMIN ? 'accent-gradient text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {u.name[0]}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 uppercase text-xs">{u.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${u.role === Role.ADMIN ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="font-black text-slate-900 text-[10px] uppercase tracking-tight">
                      {u.role === Role.ADMIN ? 'Grupo LoBueno Principal' : clients.find(c => c.id === u.clientId)?.name || 'Sin Asignar'}
                    </span>
                    {u.role === Role.CLIENT && (
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Contenido Restringido</span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  {u.id !== 'admin-root' && (
                    <button onClick={() => onRemove(u.id)} className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManager;
