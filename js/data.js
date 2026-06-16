/**
 * Portfolio data — sourced from 장범조 포토폴리오.pdf
 */
const PORTFOLIO = {
  profile: {
    name: "장범조",
    nameEn: "JANG BEOM JO",
    role: "Backend Developer",
    birth: "1998.11.21",
    location: "서울시 마포구",
    phone: "010-2527-1971",
    email: "beomjo1121@gmail.com",
    intro:
      "어려움을 성장의 기회로 바꾸며 끊임없이 도전해온 개발자입니다. " +
      "Spring Boot · Oracle · AWS · OpenAI 기반 서비스를 설계하고, " +
      "기획부터 배포까지 책임지는 개발을 지향합니다.",
    taglineEn:
      "Building reliable backend systems — from schema design to production deployment.",
  },

  education: [
    {
      period: "2021.03 — 2026.08",
      title: "국민대학교 소프트웨어학과 (심화전공)",
      desc: "졸업 예정 · 학점 2.7 / 4.3",
    },
    {
      period: "2024.01 — 2024.07",
      title: "솔데스크 — 자바·파이썬 활용 통계기반 빅데이터분석 과정",
      desc: "직업능력개발훈련과정 우수상 수상",
    },
  ],

  skills: [
    { name: "Java / Spring Boot", level: 90, stack: "Spring MVC · MyBatis · REST API" },
    { name: "Oracle / SQL", level: 88, stack: "ERD · PL/SQL · 정규화" },
    { name: "JavaScript / Frontend", level: 82, stack: "HTML5 · CSS3 · AJAX · jQuery" },
    { name: "Python / AI", level: 78, stack: "Flask · OpenAI API · 데이터 분석" },
    { name: "Cloud / DevOps", level: 75, stack: "AWS EC2 · Docker · Git · Linux" },
  ],

  techStack: [
    "Java", "Spring Boot", "MyBatis", "Oracle", "Python", "Flask",
    "JavaScript", "HTML5", "CSS3", "OpenAI API", "AWS EC2", "Docker", "Git",
  ],

  projects: [
    {
      id: "paws",
      title: "PAWS",
      period: "2026.03 — 2026.06",
      type: "캡스톤디자인 · 1인 개발",
      desc: "AI 기반 반려견 라이프 통합 플랫폼. GPS 산책 매칭, AI 상담, 커뮤니티, AWS EC2 배포.",
      tags: ["Spring Boot", "Oracle", "OpenAI", "AWS EC2"],
      href: "pages/paws.html",
      github: "https://kookmin-sw.github.io/2026-capstone-61/",
      thumb: "paws",
    },
    {
      id: "health",
      title: "헬스포인터",
      period: "2024.06 — 2024.07",
      type: "솔데스크 팀 프로젝트 · 4인",
      desc: "AI 운동·식단 추천 건강관리 플랫폼. 감성 분석, Google Chart 시각화, Flask 연동.",
      tags: ["Spring Boot", "Flask", "Oracle", "OpenAI"],
      href: "pages/healthpointer.html",
      github: "https://github.com/ljh325/team1_v2sbm3c",
      thumb: "health",
    },
    {
      id: "hobby",
      title: "숨쉴취미",
      period: "팀 프로젝트",
      type: "대학생 맞춤형 취미 추천",
      desc: "취미 추천·커뮤니티 플랫폼. DB 설계, 게시판, 풀스택 개발.",
      tags: ["HTML", "CSS", "JavaScript", "Spring Boot"],
      href: "pages/hobby.html",
      github: "https://github.com/SilVerBell0109/ss_hobby",
      thumb: "hobby",
    },
  ],

  activities: [
    { period: "2022.03 — 2025.11", title: "한강 쓰레기줍기", sub: "봉사활동" },
    { period: "2021.03 — 2026.07", title: "자유동아리", sub: "교내동아리 · 국민대학교" },
    { period: "2021.03 — 2026.07", title: "풋살 동아리", sub: "교외활동 · 띠앗머리" },
    { period: "2024.03 — 2025.12", title: "독서동아리", sub: "교외활동 · 나너울" },
  ],
};
