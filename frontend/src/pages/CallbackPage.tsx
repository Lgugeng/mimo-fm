import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function CallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('Spotify auth error:', error);
      navigate('/playlists?error=auth_failed');
      return;
    }

    if (code) {
      // Exchange code for token via backend
      fetch(`/api/spotify/callback?code=${code}`)
        .then(res => res.json())
        .then((data) => {
          if (data.access_token) {
            localStorage.setItem('spotify_access_token', data.access_token);
          }
          if (data.refresh_token) {
            localStorage.setItem('spotify_refresh_token', data.refresh_token);
          }
          navigate('/playlists');
        })
        .catch(() => navigate('/playlists?error=token_failed'));
    } else {
      navigate('/');
    }
  }, [params, navigate]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
        <p className="text-gray-400">Connecting to Spotify...</p>
      </div>
    </div>
  );
}
