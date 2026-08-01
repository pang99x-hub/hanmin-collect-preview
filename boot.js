(() => {
  const RECOVERY_KEY = "hi-ax.boot-recovered.v1";

  function recoveryAlreadyTried() {
    try {
      if (sessionStorage.getItem(RECOVERY_KEY) === "1") return true;
      sessionStorage.setItem(RECOVERY_KEY, "1");
      return false;
    } catch {
      return true;
    }
  }

  function recoveryUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set("ax-recovered", Date.now().toString());
    return url.toString();
  }

  async function clearAppShell() {
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
  }

  window.setTimeout(async () => {
    const root = document.getElementById("root");
    if (!root || root.dataset.axMounted === "true") return;

    if (!recoveryAlreadyTried()) {
      try {
        await clearAppShell();
        window.location.replace(recoveryUrl());
        return;
      } catch {
        // 아래 복구 안내를 표시한다.
      }
    }

    root.innerHTML = `
      <main style="min-height:100dvh;display:grid;place-items:center;padding:24px;background:#f6f8fb;font-family:system-ui,sans-serif;color:#172033">
        <section style="width:min(100%,380px);padding:24px;border:1px solid #d9e0ea;border-radius:8px;background:#fff">
          <strong style="display:block;margin-bottom:10px;font-size:18px">앱을 불러오지 못했습니다</strong>
          <p style="margin:0 0 16px;color:#5b6575;font-size:14px;line-height:1.6">네트워크를 확인한 뒤 다시 시도해 주세요. 문제가 계속되면 이 화면을 캡처해 주세요.</p>
          <button id="ax-boot-retry" type="button" style="width:100%;height:42px;border:0;border-radius:7px;background:#315ee8;color:#fff;font-weight:700">다시 시도</button>
        </section>
      </main>`;
    document.getElementById("ax-boot-retry")?.addEventListener("click", () => {
      window.location.reload();
    });
  }, 12_000);
})();
