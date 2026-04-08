let currentIndex = 0;
let masteredWords = [];
let studentName = "";

// ページ読み込み時の処理
window.onload = async function() {
    // 1. 生徒の名前を確認（ブラウザに保存されていなければ入力させる）
    studentName = localStorage.getItem('studentName');
    if (!studentName || studentName === "null") {
        studentName = prompt("【進捗保存用】フルネームを漢字で入力してください。");
        if (studentName) {
            localStorage.setItem('studentName', studentName);
        } else {
            studentName = "匿名希望"; // キャンセルされた場合の予備
        }
    }

    // 2. Firebaseから保存済みの進捗を読み込む
    try {
        // window.db と window.fs は index.html 側で定義されたものを使用
        const docRef = window.fs.doc(window.db, "progress", studentName);
        const docSnap = await window.fs.getDoc(docRef);

        if (docSnap.exists()) {
            masteredWords = docSnap.data().words || [];
            console.log("進捗を読み込みました:", masteredWords);
        }
    } catch (e) {
        console.error("読み込みエラー:", e);
    }

    // 3. カードのクリックイベント（回転）を設定
    const card = document.getElementById('card');
    card.onclick = function() {
        this.classList.toggle('is-flipped');
    };

    // 4. 最初のカードを表示
    displayCard();
};

// 画面更新処理
function displayCard() {
    const data = wordList[currentIndex];
    const isMastered = masteredWords.includes(data["Word"]);

    // 基本情報の書き換え
    document.getElementById("word-display").innerText = data["Word"];
    document.getElementById("pos-display").innerText = data["品詞"];
    
    const meanings = [data["意味1"], data["意味2"], data["意味3"]]
        .filter(m => m && m.trim() !== "").join(" / ");
    document.getElementById("meanings-display").innerText = meanings;

    // 覚えた！状態の反映
    document.getElementById("mastered-checkbox").checked = isMastered;
    document.getElementById("complete-badge").style.display = isMastered ? "block" : "none";

    // 派生語エリアとボタンの制御
    const dDisplay = document.getElementById('derived-display');
    const dButton = document.getElementById('show-derived');
    dDisplay.style.display = 'none';

    const hasDerived = (data["別の品詞"] && data["別の品詞"].trim() !== "") || 
                        (data["派生語1"] && data["派生語1"].trim() !== "");

    if (hasDerived) {
        dButton.style.display = "block";
        
        let otherPosHtml = data["別の品詞"] ? `
            <div style="background: #f8f9fa; padding: 8px; border-radius: 5px; margin-bottom: 10px;">
                <strong style="color: #2c3e50;">【別の品詞】</strong><br>
                ${data["別の品詞"]} : ${data["意味"] || ""}
            </div>` : "";

        let deriv1Html = data["派生語1"] ? `
            <div style="margin-bottom: 10px;">
                <strong style="color: #e67e22;">【派生語 1】</strong><br>
                <span style="font-weight: bold;">${data["派生語1"]}</span>
                <span style="color: #666;"> [${data["品詞1"] || ""}]</span><br>
                <span>${data["意味1"] || ""}</span>
            </div>` : "";

        let deriv2Html = data["派生語2"] ? `
            <div style="margin-bottom: 10px;">
                <strong style="color: #e67e22;">【派生語 2】</strong><br>
                <span style="font-weight: bold;">${data["派生語2"]}</span>
                <span style="color: #666;"> [${data["品詞2"] || ""}]</span><br>
                <span>${data["意味2"] || ""}</span>
            </div>` : "";

        dDisplay.innerHTML = `<hr style="margin: 15px 0; border: 0; border-top: 2px dotted #eee;">${otherPosHtml}${deriv1Html}${deriv2Html}`;
    } else {
        dButton.style.display = "none";
    }

    updateProgress();
}

// チェックボックスをクリックした時の処理（Firebaseへ保存）
window.toggleMastered = async function(event) {
    const word = wordList[currentIndex]["Word"];
    
    if (event.target.checked) {
        if (!masteredWords.includes(word)) {
            masteredWords.push(word);
        }
    } else {
        masteredWords = masteredWords.filter(w => w !== word);
    }

    // 画面上の見た目を即座に更新
    document.getElementById("complete-badge").style.display = event.target.checked ? "block" : "none";
    updateProgress();

    // Firebaseへ送信（非同期）
    try {
        await window.fs.setDoc(window.fs.doc(window.db, "progress", studentName), {
            words: masteredWords,
            updatedAt: new Date()
        });
    } catch (e) {
        console.error("保存エラー:", e);
        alert("進捗の保存に失敗しました。ネット環境を確認してください。");
    }
};

// 進捗表示の更新
function updateProgress() {
    const total = wordList.length;
    const masteredCount = masteredWords.filter(w => wordList.some(item => item.Word === w)).length;
    const percent = total > 0 ? (masteredCount / total) * 100 : 0;
    
    document.getElementById("progress-text").innerText = `${masteredCount} / ${total} 単語完了`;
    document.getElementById("progress-bar").style.width = `${percent}%`;
}

// ナビゲーション
window.nextCard = function() {
    if (currentIndex < wordList.length - 1) {
        currentIndex++;
        document.getElementById('card').classList.remove('is-flipped');
        displayCard();
    }
};

window.prevCard = function() {
    if (currentIndex > 0) {
        currentIndex--;
        document.getElementById('card').classList.remove('is-flipped');
        displayCard();
    }
};

window.toggleDerived = function(event) {
    event.stopPropagation();
    const d = document.getElementById('derived-display');
    d.style.display = d.style.display === 'block' ? 'none' : 'block';
};