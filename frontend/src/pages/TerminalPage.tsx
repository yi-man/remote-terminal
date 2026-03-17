import { useParams, useNavigate } from 'react-router-dom';
import { Terminal } from '../components/Terminal';

export function TerminalPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/');
    return null;
  }

  return <Terminal connectionId={id} onDisconnect={() => navigate('/')} />;
}
