import React from 'react';
import { SCREENS } from '../screens';
import { WorkspaceMember, WorkspaceInvite, WorkspaceRole, WORKSPACE_ROLE_LABELS } from '../types';
import { workspaceApi } from '../services/api';

interface UserManagerProps {
  members: WorkspaceMember[];
  workspaceName: string;
  currentUserId?: string;
  onInvite: (email: string, role: WorkspaceRole) => Promise<void>;
  onChangeRole: (userId: string, role: WorkspaceRole) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
}

const ROLE_HINTS: Record<WorkspaceRole, string> = {
  OWNER: 'Control total, incluida la facturación. Siempre debe quedar al menos uno.',
  ADMIN: 'Gestiona marcas, briefs, miembros y configuración del workspace.',
  MEMBER: 'Genera y consulta contenido de todas las marcas, sin gestionar el workspace.',
};

const UserManager: React.FC<UserManagerProps> = ({
  members,
  workspaceName,
  currentUserId,
  onInvite,
  onChangeRole,
  onRemove,
}) => {
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<WorkspaceRole>('MEMBER');
  const [invites, setInvites] = React.useState<WorkspaceInvite[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refreshInvites = React.useCallback(() => {
    workspaceApi.invites().then(setInvites).catch(() => setInvites([]));
  }, []);

  React.useEffect(refreshInvites, [refreshInvites]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onInvite(email.trim(), role);
      setEmail('');
      setRole('MEMBER');
      refreshInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la invitación');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await workspaceApi.revokeInvite(id);
      refreshInvites();
    } catch {
      setError('No se pudo revocar la invitación');
    }
  };

  const ownerCount = members.filter(m => m.role === 'OWNER').length;
  const inputStyle =
    'px-4 py-2.5 bg-white border border-[#E5E5E7] rounded-[10px] text-[13px] text-[#1D1D1F] outline-none focus:border-[#1D1D1F] transition-colors';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-[20px] font-semibold text-[#1D1D1F] tracking-[-0.01em]">{SCREENS.users.name}</h2>
        <p className="text-[13px] text-[#86868B] mt-1">
          Quién tiene acceso a <span className="text-[#1D1D1F] font-medium">{workspaceName}</span> y con qué permisos.
          Nadie entra por su dominio de email: el acceso se otorga acá.
        </p>
      </header>

      {/* Invitar */}
      <section className="bg-[#F5F5F7] rounded-[14px] p-5">
        <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-3">Invitar a alguien</h3>
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[220px]">
            <label htmlFor="invite-email" className="text-[11px] text-[#86868B]">Email</label>
            <input
              id="invite-email"
              required
              type="email"
              placeholder="persona@empresa.com"
              className={inputStyle}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5 min-w-[180px]">
            <label htmlFor="invite-role" className="text-[11px] text-[#86868B]">Rol</label>
            <select
              id="invite-role"
              className={inputStyle}
              value={role}
              onChange={e => setRole(e.target.value as WorkspaceRole)}
            >
              <option value="MEMBER">{WORKSPACE_ROLE_LABELS.MEMBER}</option>
              <option value="ADMIN">{WORKSPACE_ROLE_LABELS.ADMIN}</option>
              <option value="OWNER">{WORKSPACE_ROLE_LABELS.OWNER}</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2.5 bg-ink text-white rounded-[10px] text-[13px] font-medium hover:bg-ink disabled:opacity-40 transition-colors"
          >
            {busy ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </form>
        <p className="text-[12px] text-[#86868B] mt-3">{ROLE_HINTS[role]}</p>
        {error && <p className="text-[12px] text-[#C4351C] mt-2">{error}</p>}
      </section>

      {/* Invitaciones pendientes */}
      {invites.length > 0 && (
        <section>
          <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-3">
            Invitaciones pendientes ({invites.length})
          </h3>
          <ul className="divide-y divide-[#E5E5E7] border border-[#E5E5E7] rounded-[14px] overflow-hidden">
            {invites.map(invite => (
              <li key={invite.id} className="flex items-center justify-between gap-4 px-5 py-3.5 bg-white">
                <div className="min-w-0">
                  <div className="text-[13px] text-[#1D1D1F] truncate">{invite.email}</div>
                  <div className="text-[11px] text-[#86868B] mt-0.5">
                    {WORKSPACE_ROLE_LABELS[invite.role]} · vence el{' '}
                    {new Date(invite.expiresAt).toLocaleDateString('es-CO')}
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(invite.id)}
                  className="text-[12px] text-[#86868B] hover:text-[#C4351C] transition-colors shrink-0"
                >
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Miembros */}
      <section>
        <h3 className="text-[13px] font-semibold text-[#1D1D1F] mb-3">Miembros ({members.length})</h3>
        <ul className="divide-y divide-[#E5E5E7] border border-[#E5E5E7] rounded-[14px] overflow-hidden">
          {members.map(member => {
            const isSelf = member.id === currentUserId;
            const isLastOwner = member.role === 'OWNER' && ownerCount <= 1;
            return (
              <li key={member.id} className="flex items-center justify-between gap-4 px-5 py-3.5 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#1D1D1F] text-[12px] font-medium flex items-center justify-center shrink-0">
                    {member.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] text-[#1D1D1F] truncate">
                      {member.name}
                      {isSelf && <span className="text-[#86868B] font-normal"> · vos</span>}
                    </div>
                    <div className="text-[11px] text-[#86868B] truncate">{member.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <select
                    aria-label={`Rol de ${member.name}`}
                    className="px-3 py-1.5 bg-[#F5F5F7] border border-transparent rounded-[8px] text-[12px] text-[#1D1D1F] outline-none focus:border-[#1D1D1F] disabled:opacity-40 transition-colors"
                    value={member.role}
                    disabled={isLastOwner}
                    title={isLastOwner ? 'El workspace necesita al menos un propietario' : undefined}
                    onChange={e => onChangeRole(member.id, e.target.value as WorkspaceRole)}
                  >
                    <option value="MEMBER">{WORKSPACE_ROLE_LABELS.MEMBER}</option>
                    <option value="ADMIN">{WORKSPACE_ROLE_LABELS.ADMIN}</option>
                    <option value="OWNER">{WORKSPACE_ROLE_LABELS.OWNER}</option>
                  </select>
                  <button
                    onClick={() => onRemove(member.id)}
                    disabled={isLastOwner}
                    className="text-[12px] text-[#86868B] hover:text-[#C4351C] disabled:opacity-30 disabled:hover:text-[#86868B] transition-colors"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

export default UserManager;
