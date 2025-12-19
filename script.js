const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = document.querySelector("#file-cancel");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");

const userData = {
    message: null,
    file: {
        data: null,
        mime_type: null
    }
}
const API_BASE  = "http://localhost:5000/api";
const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

// create message element with dynamic classes and return it
const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

//generate bot response using API
const generateBotResponse = async (incomingMessageDiv) => {
    const messageElement = incomingMessageDiv.querySelector(".message-text");

    //add user message to chat history
    chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }]
    });

    try {
    // BACKEND KO CALL
    const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message: userData.message,
            history: chatHistory
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Backend error");

    const apiResponseText = data.reply.trim();
    messageElement.innerText = apiResponseText;

    // 💾 save bot response to mongodb
    fetch(`${API_BASE}/save-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            role: "model",
            text: apiResponseText
        })
    });

    // add bot response to chat history
    chatHistory.push({
        role: "model",
        parts: [{ text: apiResponseText }]
    });

    } catch (error) {
    console.error(error);
    messageElement.innerText = "Error getting response";
    messageElement.style.color = "#ff0000";
    } finally {
        //reset user's file data, removing thinking indicator and scroll chat to bottom
        userData.file = { data: null, mime_type: null };
        incomingMessageDiv.classList.remove("thinking");
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    }
}

//handle outgoing user messages
const handleOutgoingMessage = (e) => {
    e.preventDefault();
    userData.message = messageInput.value.trim();
    messageInput.value = "";
    fileUploadWrapper.classList.remove("file-uploaded");
    messageInput.dispatchEvent(new Event("input"));

    //create and display user message
    const messageContent = `<div class="message-text">${userData.message}</div>
                            ${userData.file.data ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="attachment" />` : ""}`;
    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    outgoingMessageDiv.querySelector(".message-text").textContent = userData.message;
    chatBody.appendChild(outgoingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    //save user message to mongodb
    fetch(`${API_BASE}/save-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            role: "user",
            text: userData.message
        })
    });


    //simulate bot response with thinking indicator after a delay
    setTimeout(() => {
        const messageContent = `<span class="bot-avatar"><i class="fa-solid fa-robot" width="50" height="50"
                        viewBox="0 0 1024 1024"></i></span>
                <div class="message-text">
                    <div class="thinking-indicator">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>`;
        const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);
        chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
        generateBotResponse(incomingMessageDiv);
    }, 600);
}

//handle enter key press for sending messges
messageInput.addEventListener("keydown", (e) => {
    const userMessage = e.target.value.trim();
    if (e.key === "Enter" && userMessage && !e.shiftkey && window.innerWidth > 768) {
        handleOutgoingMessage(e);
    }
});

//adjust input field height dynamically
messageInput.addEventListener("input", () => {
    messageInput.style.height = `${initialInputHeight}px`;
    messageInput.style.height = `${messageInput.scrollHeight}px`;
    document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});

//handle file input change and preview the selected file
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        fileUploadWrapper.querySelector("img").src = e.target.result;
        fileUploadWrapper.classList.add("file-uploaded");
        const base64String = e.target.result.split(",")[1];

        //store file data in userData
        userData.file = {
            data: base64String,
            mime_type: file.type
        }
        fileInput.value = "";
    }

    reader.readAsDataURL(file);
});

//cancel file upload
fileCancelButton.addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("file-uploaded");
});

//initialize emoji picker and handle emoji selection
const picker = new EmojiMart.Picker({
    theme: "light",
    skinTonePosition: "none",
    previewPosition: "none",
    onEmojiSelect: (emoji) => {
        const { selectionStart: start, selectionEnd: end } = messageInput;
        messageInput.setRangeText(emoji.native, start, end, "end");
        messageInput.focus();
    },
    onClickOutside: (e) => {
        if (e.target.id === "emoji-picker") {
            document.body.classList.toggle("show-emoji-picker");
        } else {
            document.body.classList.remove("show-emoji-picker");
        }
    }
});

document.querySelector(".chat-form").appendChild(picker);

sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));



// Theme Management
const themeToggler = document.querySelector("#theme-toggler");
const themeSelector = document.querySelector(".theme-selector");
const themeButtons = document.querySelectorAll(".theme-btn");

function loadTheme() {
    const savedTheme = localStorage.getItem('chatbot-theme') || 'default';
    setTheme(savedTheme);
}

function setupThemeSwitching() {
    themeButtons.forEach(button => {
        button.addEventListener("click", () => {
            const theme = button.dataset.theme;
            setTheme(theme);
        });
    });
}

function setTheme(themeName) {
    // Remove all theme classes
    document.body.classList.remove('theme-dark', 'theme-green', 'theme-red', 'theme-purple', 'theme-blue');
    
    // Add selected theme class
    if (themeName !== 'default') {
        document.body.classList.add(`theme-${themeName}`);
    }
    
    // Update active button
    themeButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === themeName) {
            btn.classList.add('active');
        }
    });
    
    // Save theme preference
    localStorage.setItem('chatbot-theme', themeName);
}

function setupThemeToggler() {
    themeToggler.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent immediate close
        themeSelector.classList.toggle("hidden");
    });
    
    // Close theme selector when clicking outside
    document.addEventListener("click", (e) => {
        if (!themeSelector.contains(e.target) && !themeToggler.contains(e.target)) {
            themeSelector.classList.add("hidden");
        }
    });
    
    // Close theme selector when a theme is selected
    themeButtons.forEach(button => {
        button.addEventListener("click", () => {
            setTimeout(() => {
                themeSelector.classList.add("hidden");
            }, 300);
        });
    });
}

// Initialize theme functionality
loadTheme();
setupThemeSwitching();
setupThemeToggler();