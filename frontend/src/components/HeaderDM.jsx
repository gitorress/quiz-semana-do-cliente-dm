import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { obterUsuario, logout } from '../api.js';

export default function HeaderDM({ pontuacaoTotal }) {
  const usuario = obterUsuario();
  const navigate = useNavigate();

  function sair() {
    logout();
    navigate('/');
  }

  return (
    <div className="header-dm">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src="/logo-dm.png" alt="DM" style={{ height: 44 }} />
      </div>
      <div className="usuario-info">
        {usuario && <span>{usuario.nome}</span>}
        {typeof pontuacaoTotal === 'number' && <span>· {pontuacaoTotal} pts</span>}
        {usuario?.is_admin && (
          <Link to="/admin" className="btn btn-secundario" style={{ padding: '6px 14px', fontSize: 13, textDecoration: 'none' }}>
            Painel Admin
          </Link>
        )}
        <button className="btn btn-secundario" style={{ padding: '6px 14px', fontSize: 13 }} onClick={sair}>
          Sair
        </button>
      </div>
    </div>
  );
}