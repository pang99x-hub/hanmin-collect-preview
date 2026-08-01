(() => {
  const status = document.getElementById("repair-status");

  async function repair() {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) => registration.scope.startsWith(window.location.origin))
          .map((registration) => registration.unregister()),
      );
    }
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("hi-ax-shell-"))
          .map((name) => caches.delete(name)),
      );
    }
    window.location.replace(`/?ax-repaired=${Date.now()}#/classes`);
  }

  repair().catch(() => {
    if (status) {
      status.textContent =
        "자동 복구에 실패했습니다. Chrome의 사이트 설정에서 저장된 데이터를 삭제한 뒤 다시 접속해 주세요.";
    }
  });
})();
