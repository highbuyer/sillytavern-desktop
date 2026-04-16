import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreState } from '../store/useStore';

interface RoleSelectorProps {
  selectedRoleId: number;
  onRoleChange: (roleId: number) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRoleId, onRoleChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { roles } = useStoreState();
  const navigate = useNavigate();
  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const handleRoleSelect = (roleId: number) => {
    onRoleChange(roleId);
    setIsOpen(false);
  };

  return (
    <div className="role-selector">
      <button 
        className="role-selector-toggle"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
      >
        <img src={selectedRole.avatar} alt={selectedRole.name} className="role-avatar" />
        <span className="role-name">{selectedRole.name}</span>
        <span className="dropdown-arrow">▼</span>
      </button>
      
      {isOpen && (
        <div className="role-dropdown">
          <div className="role-dropdown-header">
            <span>选择角色</span>
            <button className="btn-link" onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="role-list">
            {roles.map(role => (
              <div
                key={role.id}
                className={`role-item ${role.id === selectedRoleId ? 'selected' : ''}`}
                onClick={() => handleRoleSelect(role.id)}
              >
                <img src={role.avatar} alt={role.name} className="role-avatar" />
                <div className="role-info">
                  <div className="role-name">{role.name}</div>
                  <div className="role-desc">{role.description}</div>
                </div>
                {role.id === selectedRoleId && <span className="check-mark">✓</span>}
              </div>
            ))}
          </div>
          <div className="role-dropdown-footer">
            <button className="btn-link" onClick={(e) => { e.stopPropagation(); navigate('/roles'); }}>
              管理角色
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelector;
