(function() {
    // ---------- CONFIG ----------
    const TENANT_ID = document.currentScript.getAttribute("data-tenant");
    const N8N_ENDPOINT = "https://edn8n.oph.st/webhook/5ffdb28c-1355-449d-b637-1eedaaf3b8e9"; 

    // ---------- UTILITIES ----------
    function uuid() {
        return crypto.randomUUID();
    }

    function getOrCreateUserId() {
        const saved = localStorage.getItem("rag_user_id");
        if (saved) return saved;

        const newId = "usr_" + uuid();
        localStorage.setItem("rag_user_id", newId);
        return newId;
    }

    function getOrCreateSessionId() {
        let session = sessionStorage.getItem("rag_session_id");
        if (session) return session;

        session = "sess_" + uuid();
        sessionStorage.setItem("rag_session_id", session);
        return session;
    }

    function resetSession() {
        sessionStorage.removeItem("rag_session_id");
    }

    // ---------- IDENTIFIERS ----------
    const userId = getOrCreateUserId();
    let sessionId = getOrCreateSessionId();

    // ---------- UI CREATION ----------
    const button = document.createElement("div");
    button.innerHTML = "💬";
    button.style.position = "fixed";
    button.style.bottom = "20px";
    button.style.right = "20px";
    button.style.width = "60px";
    button.style.height = "60px";
    button.style.borderRadius = "50%";
    button.style.background = "#4F46E5";
    button.style.color = "#fff";
    button.style.display = "flex";
    button.style.justifyContent = "center";
    button.style.alignItems = "center";
    button.style.cursor = "pointer";
    button.style.fontSize = "28px";
    button.style.zIndex = 999999;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.bottom = "90px";
    iframe.style.right = "20px";
    iframe.style.width = "350px";
    iframe.style.height = "450px";
    iframe.style.border = "1px solid #CCC";
    iframe.style.borderRadius = "10px";
    iframe.style.boxShadow = "0 0 20px rgba(0,0,0,0.2)";
    iframe.style.display = "none";
    iframe.style.zIndex = 999998;
    iframe.srcdoc = `
        <html>
        <body style="margin:0;font-family:sans-serif;display:flex;flex-direction:column;height:100%;">
            <div style="padding:10px;background:#4F46E5;color:white;">AI Assistant</div>
            <div id="messages" style="flex:1;overflow-y:auto;padding:10px;"></div>

            <div style="padding:10px;display:flex;gap:5px;">
                <input id="msg" style="flex:1;padding:6px;border:1px solid #CCC;border-radius:5px;" placeholder="Your message..." />
                <button id="send" style="padding:6px 10px;background:#4F46E5;color:white;border:none;border-radius:5px;">Send</button>
            </div>

            <script>
                const messages = document.getElementById("messages");
                const sendBtn = document.getElementById("send");
                const input = document.getElementById("msg");

                function addMessage(role, text) {
                    const d = document.createElement("div");
                    d.innerHTML = "<b>" + role + "</b>: " + text;
                    d.style.marginBottom = "10px";
                    messages.appendChild(d);
                    messages.scrollTop = messages.scrollHeight;
                }

                window.addEventListener("message", async (event) => {
                    const { tenant_id, user_id, session_id, message } = event.data;

                    addMessage("You", message);

                    const res = await fetch("${N8N_ENDPOINT}", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tenant_id, user_id, session_id, message })
                    });

                    const data = await res.json();
                    addMessage("AI", data.reply || "[No reply]");
                });

                sendBtn.onclick = () => {
                    const msg = input.value.trim();
                    if (!msg) return;
                    window.parent.postMessage({ type: "send", message: msg }, "*");
                    input.value = "";
                };
            </script>
        </body>
        </html>
    `;

    // ---------- WIDGET BEHAVIOR ----------
    button.onclick = () => {
        iframe.style.display = iframe.style.display === "none" ? "block" : "none";
    };

    window.addEventListener("message", (event) => {
        if (event.data.type === "send") {
            const payload = {
                tenant_id: TENANT_ID,
                user_id: userId,
                session_id: sessionId,
                message: event.data.message
            };
            iframe.contentWindow.postMessage(payload, "*");
        }
    });

    // Inject into page
    document.body.appendChild(button);
    document.body.appendChild(iframe);

})();
