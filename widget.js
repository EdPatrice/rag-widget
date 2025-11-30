(function () {

    console.log("Widget script loaded!");

    // --- Utility: Create or retrieve persistent session ID ---
    function getSessionId() {
        const key = "chat_widget_session_id";
        let id = localStorage.getItem(key);
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem(key, id);
        }
        return id;
    }

    // --- Utility: Extract tenant ID from script tag ---
    function getTenantId() {
        const script = document.currentScript;
        const tenant = script?.dataset?.tenant;
        if (!tenant) {
            console.error("Chat widget error: Missing data-tenant attribute.");
            return null;
        }
        return tenant;
    }

    const tenantId = getTenantId();
    const sessionId = getSessionId();

    // Stop if tenant missing
    if (!tenantId) return;

    document.addEventListener("DOMContentLoaded", () => {
        // --- Create container for Shadow DOM ---
        const container = document.createElement("div");
        container.id = "chat-widget-container";
        document.body.appendChild(container);

        const shadow = container.attachShadow({ mode: "open" });

        // --- Styles ---
        const style = document.createElement("style");
        style.textContent = `
            .chat-button {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #2c7be5;
                color: white;
                border-radius: 30px;
                padding: 15px 20px;
                cursor: pointer;
                font-family: sans-serif;
                box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                z-index: 999999;
            }

            .chat-window {
                position: fixed;
                bottom: 80px;
                right: 20px;
                width: 350px;
                height: 500px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                display: none;
                flex-direction: column;
                overflow: hidden;
                z-index: 999999;
                font-family: sans-serif;
            }

            .chat-header {
                background: #2c7be5;
                color: white;
                padding: 12px;
                font-weight: bold;
            }

            .messages {
                flex: 1;
                padding: 10px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
                background: #f5f5f5;
            }

            .msg-user {
                align-self: flex-end;
                background: #2c7be5;
                color: white;
                padding: 10px;
                border-radius: 12px;
                max-width: 75%;
            }

            .msg-bot {
                align-self: flex-start;
                background: #e8e8e8;
                color: black;
                padding: 10px;
                border-radius: 12px;
                max-width: 75%;
            }

            .chat-input {
                display: flex;
                padding: 10px;
                gap: 6px;
                background: white;
                border-top: 1px solid #ddd;
            }

            .chat-input input {
                flex: 1;
                padding: 8px;
                border-radius: 8px;
                border: 1px solid #ccc;
                outline: none;
            }

            .chat-input button {
                background: #2c7be5;
                color: white;
                border: none;
                padding: 8px 14px;
                border-radius: 8px;
                cursor: pointer;
            }
        `;
        shadow.appendChild(style);

        // --- HTML Structure ---
        const html = document.createElement("div");
        html.innerHTML = `
            <div class="chat-button">💬</div>
            <div class="chat-window">
                <div class="chat-header">AI Assistant</div>
                <div class="messages"></div>
                <div class="chat-input">
                    <input type="text" placeholder="Type your message..." />
                    <button>Send</button>
                </div>
            </div>
        `;
        shadow.appendChild(html);

        const btn = shadow.querySelector(".chat-button");
        const windowEl = shadow.querySelector(".chat-window");
        const messages = shadow.querySelector(".messages");
        const input = shadow.querySelector(".chat-input input");
        const sendBtn = shadow.querySelector(".chat-input button");

        // --- Toggle window ---
        btn.addEventListener("click", () => {
            windowEl.style.display = windowEl.style.display === "none" ? "flex" : "none";
        });

        // --- Add message to UI ---
        function addMessage(text, sender) {
            const bubble = document.createElement("div");
            bubble.className = sender === "user" ? "msg-user" : "msg-bot";
            bubble.textContent = text;
            messages.appendChild(bubble);
            messages.scrollTop = messages.scrollHeight;
        }

        // --- Send message to n8n ---
        async function sendToN8N(message) {
            addMessage(message, "user");

            try {
                const res = await fetch("https://edn8n.oph.st/webhook/5ffdb28c-1355-449d-b637-1eedaaf3b8e9", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tenant_id: tenantId,
                        session_id: sessionId,
                        message: message
                    })
                });

                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }

                // Get response as text first
                const responseText = await res.text();
                
                let botResponse;
                
                // Try to parse as JSON
                try {
                    const data = JSON.parse(responseText);
                    
                    // Handle various JSON response formats
                    if (data.response) {
                        botResponse = data.response;
                    } else if (data.output) {
                        botResponse = data.output;
                    } else if (data.message) {
                        botResponse = data.message;
                    } else if (data.answer) {
                        botResponse = data.answer;
                    } else if (typeof data === 'string') {
                        botResponse = data;
                    } else {
                        botResponse = "I received your message but couldn't find a response.";
                    }
                } catch (jsonError) {
                    // If JSON parsing fails, treat as plain text
                    botResponse = responseText;
                }
                
                addMessage(botResponse, "bot");

            } catch (err) {
                addMessage("Error contacting server. Please try again.", "bot");
                console.error("Chat widget error:", err);
            }
        }

        // --- Send on click ---
        sendBtn.addEventListener("click", () => {
            if (input.value.trim() !== "") {
                sendToN8N(input.value.trim());
                input.value = "";
            }
        });

        // --- Send on Enter ---
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && input.value.trim() !== "") {
                sendToN8N(input.value.trim());
                input.value = "";
            }
        });
    });
})();
