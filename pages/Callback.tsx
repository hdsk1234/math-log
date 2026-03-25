import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Callback: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // URL에서 ?code=... 부분을 파싱합니다.
    const params = new URLSearchParams(location.search);
    const code = params.get('code');

    if (code) {
      // 여기에 Flask 백엔드로 code를 보내는 로직을 넣을 예정입니다.
      console.log("네이버 밴드 인증 코드:", code);
      
      // 테스트 단계에서는 콘솔 확인 후 메인으로 리다이렉트 처리
      // alert("로그인 성공!"); 
      // navigate('/');
    }
  }, [location, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <h2>네이버 밴드 로그인 처리 중입니다...</h2>
    </div>
  );
};

export default Callback;