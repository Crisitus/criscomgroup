import React from 'react';
import styled from 'styled-components';
import { useTheme } from '../contexts/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

const ToggleContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ToggleButton = styled.button<{ $isDark: boolean }>`
  position: relative;
  width: 60px;
  height: 30px;
  border-radius: 25px;
  border: none;
  cursor: pointer;
  background: ${props => props.$isDark
    ? 'linear-gradient(135deg, #1E606D 0%, #144C59 100%)'
    : 'linear-gradient(135deg, #144C59 0%, #DAA520 100%)'
  };
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isDark
    ? '0 4px 15px rgba(20, 76, 89, 0.4)'
    : '0 4px 15px rgba(218, 165, 32, 0.4)'
  };

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$isDark
      ? '0 6px 20px rgba(30, 96, 109, 0.6)'
      : '0 6px 20px rgba(218, 165, 32, 0.6)'
    };
  }

  &:active {
    transform: translateY(0);
  }
`;

const ToggleSlider = styled.div<{ $isDark: boolean }>`
  position: absolute;
  top: 3px;
  left: ${props => props.$isDark ? '33px' : '3px'};
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const IconWrapper = styled.div<{ $isDark: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$isDark ? '#1E606D' : '#144C59'};
  font-size: 12px;
  transition: all 0.3s ease;
`;

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ToggleContainer>
      <ToggleButton $isDark={isDark} onClick={toggleTheme}>
        <ToggleSlider $isDark={isDark}>
          <IconWrapper $isDark={isDark}>
            {isDark ? <FiMoon /> : <FiSun />}
          </IconWrapper>
        </ToggleSlider>
      </ToggleButton>
    </ToggleContainer>
  );
};

export default ThemeToggle;