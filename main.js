/* jshint curly:true, debug:true */
/* globals $, firebase, moment */



new Vue({
  el: '#app',
  data: {
    currentView: "",
    email: "",
    password: "",
    loginAlert: false,
    loginHelpText: "",
    loginButtonText: "ログイン",
    currentUser: "",
    memos: [],
    addMemoTitle: "",
    addMemoDetails: "",
    addMemoAlert: false,
    addMemoHelpText: "",
    AddMemoButtonText: "保存する",
    currentMemoId: "",
    currentMemoTitle: "",
    currentMemoDetails: "",
    currentMemoDate: "",
    memosLenght: 0,
    singleViewMode: "View",
    editMemoTitle: "",
    editMemoDetails: "",
    isPush: false,        // ログインボタンのDisabledを管理
    memoAlert: false,
    memoHelpText: "",
    singleViewDisplay: true,
    collectionViewDisplay: true,
  },
  computed: {
    lastestMemo: function() {
      return this.memos[0];
    },
    // 最新順に並び替え
    reverseMemos: function() {
      this.memos.sort(function(memoA, memoB) {
        if (memoA.updatedAt < memoB.updatedAt) {
          return -1;
        } else {
          return 1;
        }
      });
      return this.memos.reverse();
    },
    currentMemoIndexOf: function() {
      const result = this.memos.findIndex(memo => memo.id === this.currentMemoId);
      return result;
    },
    // クライアントの幅を取得 (720px 未満を Mobile)
    isMobileDevice: function() {
      if (document.documentElement.clientWidth > 720) {
        return false;
      } else {
        return true;
      }
    },
  },
  methods: {
    // 日付変換
    formatDate: function(timestamp) {
      const m = moment(timestamp);
      return `${m.format('YYYY/MM/DD')} ${m.format('HH:mm')}`;
    },
    
    // カレントメモの内容をセット
    setCurrentMemo: function() {
      let that = this;
      const target = Object(that.memos).find(function(el) {
        return (el.id === that.currentMemoId);
      });
      // console.dir(target);
      that.currentMemoTitle = target.title;
      that.currentMemoDetails = target.details;
      that.currentMemoDate = target.updatedAt;
    },
    // メモコレクションからカレントメモ選択
    selectedMemo: function(e) {
      let memoId = e.target.id; 
      if (memoId === ""){
        memoId = e.target.parentElement.id
      }
      this.currentMemoId = memoId;
      this.setCurrentMemo();
      
      this.collectionViewDisplay = !this.isMobileDevice;
      this.singleViewDisplay = true;
      this.singleViewMode = "View";
      this.memoAlert = false;
      this.memoHelpText = "";
    },
    returnToCollectionView: function() {
      this.collectionViewDisplay = true;
      this.singleViewDisplay = !this.isMobileDevice;
    },
    /**
    * --------------------
    * ログイン・ログアウト関連
    * --------------------
    */
    // ログインフォームを初期状態に戻す
    resetLoginForm: function() {
      this.loginAlert = false;
      this.isPush = false;
      this.loginButtonText = "ログイン";
    },
    
    // ユーザ作成のときパスワードが弱すぎる場合に呼ばれる
    onWeakPassword: function() {
      this.resetLoginForm();
      this.loginHelpText = "6文字以上のパスワードを入力してください";
      this.loginAlert = true;
    },
    
    // ログインのときパスワードが間違っている場合に呼ばれる
    onWrongPassword: function() {
      this.resetLoginForm();
      this.loginHelpText = "正しいパスワードを入力してください";
      this.loginAlert = true;
    },
    
    // ログインのとき試行回数が多すぎてブロックされている場合に呼ばれる
    onTooManyRequests: function() {
      this.resetLoginForm();
      this.isPush = true;
      this.loginHelpText = "試行回数が多すぎます。後ほどお試しください。";
      this.loginAlert = true;
    },
    
    // ログインのときメールアドレスの形式が正しくない場合に呼ばれる
    onInvalidEmail: function() {
      this.resetLoginForm();
      this.loginHelpText = "メールアドレスを正しく入力してください。";
      this.loginAlert = true;
    },
    
    // その他のログインエラーの場合に呼ばれる
    onOtherLoginError: function() {
      this.resetLoginForm();
      this.loginHelpText = "ログインに失敗しました。";
      this.loginAlert = true;
    },

    // ユーザ作成に失敗したことをユーザに通知する
    catchErrorOnCreateUser: function(error) {
      // 作成失敗
      console.error('ユーザ作成に失敗:', error.code);
      if (error.code === 'auth/weak-password') {
        this.onWeakPassword();
      } else {
        // その他のエラー
        this.onOtherLoginError(error);
      }
    },
    // ログインに失敗したことをユーザーに通知する
    catchErrorOnSignIn: function(error) {
      if (error.code === 'auth/wrong-password') {
        // パスワードの間違い
        this.onWrongPassword();
      } else if (error.code === 'auth/too-many-requests') {
        // 試行回数多すぎてブロック中
        this.onTooManyRequests();
      } else if (error.code === 'auth/invalid-email') {
        // メールアドレスの形式がおかしい
        this.onInvalidEmail();
      } else {
        // その他のエラー
        this.onOtherLoginError(error);
      }
    },
    
    // ログイン
    loginSubmit: function(e) {
      let that = this;
      e.preventDefault();
      this.isPush = true;
      this.loginButtonText = "送信中...";
      
      firebase
        .auth()
        .signInWithEmailAndPassword(this.email, this.password)
        .then(function() {
          that.resetLoginForm();
        })
        .catch(function(error) {
          console.error('ログインエラー', error);
          if (error.code === 'auth/user-not-found') {
          // 該当ユーザが存在しない場合は新規作成する
            firebase
              .auth()
              .createUserWithEmailAndPassword(that.email, that.password)
              .then(function() {
                // 作成成功
              })
              .catch(function(error) {
                that.catchErrorOnCreateUser(error);
              });
          } else {
            that.catchErrorOnSignIn(error);
          }
        });
    },
    // ビュー（画面）を変更する
    showView: function(id) {
      this.currentView = id;
    },
    // Firebaseよりメモデータを参照、追加・削除イベントハンドラを登録
    setMemosRef: function() {
      let that = this;
      const memosRef = firebase
        .database()
        .ref(`${that.currentUser}/memos`);
        //.orderByChild('updatedAt');
      
      memosRef.off('value');
        
      memosRef.orderByChild('updatedAt')
        .on('value', function(memosSnapshot) {
          const memosData = memosSnapshot.val();
          const memosKey = memosSnapshot.key;
          // データがあれば処理をする
          if (memosData !== null) {
            // データオブジェクトを配列に変更する
            let tempMemos = [];
            Object.keys(memosData).forEach(function(val, memosKey) {
              memosData[val].id = val
              tempMemos.push(memosData[val])
            });
            that.memos = tempMemos;
        
            if (that.currentMemoId === '') {
              that.currentMemoId = that.reverseMemos[0].id;
            }
            that.setCurrentMemo();
          } else {
            // メモがありません。
            that.memos = [];
            that.singleViewMode = "View";
            that.currentMemoTitle = "";
            that.currentMemoDetails = "";
          }
        });
    }, 
    // ログアウトボタンが押されたらログアウトする
    logoutClick: function() {
      firebase
        .auth()
        .signOut()
        .catch(function(error) {
          console.error('ログアウトに失敗:', error);
        });
    },
    
    // ログインした直後に呼ばれる
    onLogin: function() {
      this.setMemosRef();
      this.collectionViewDisplay = true;
      this.singleViewDisplay = !this.isMobileDevice;
  
      this.showView('main');
    },
    // ログアウトした直後に呼ばれる
    onLogout: function() {
      const memosRef = firebase.database().ref(`${this.currentUser}/memos`);

      // 過去に登録したイベントハンドラを削除
      memosRef.off('value');
      memosRef.off('child_added');
      memosRef.off('child_removed');
      
      // currentデータを削除
      this.currentMemoDate = "";
      this.currentMemoDetails = "";
      this.currentMemoId = "";
      this.currentMemoTitle = "";
      this.currentUser = "";
      
      this.memos = [];
      this.resetLoginForm();
      this.showView('login');
    },
    // メモの入力チェック =========== バリデーション
    checkForm: function() {
      if (this.addMemoTitle) {
        return true;
      }
      if (!this.addMemoTitle) {
        this.memoHelpText='タイトルは必須です。';
        this.memoAlert = true;
        
      }
    },
    
    // 新規メモの入力  ============== Memo.New
    newMemo: function() {
      this.collectionViewDisplay = !this.isMobileDevice;
      this.singleViewDisplay = true;
      this.singleViewMode ="New";
      // フォーカスの移動
      const targetElement = this.$refs.addMemoTitle;
      this.$nextTick(function() {
        this.$refs.addMemoTitle.focus();
      })
    },
    // メモの登録処理 =============== Memo.Update
    addMemoSubmit: function() {
      if (!this.addMemoTitle) {
        this.memoHelpText='タイトルは必須です。';
        this.memoAlert = true;
        return;
      }
      
      let that = this;
    
      const memoData = {
        title: this.addMemoTitle,
        details: this.addMemoDetails,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
      };
      const memoRef = firebase
        .database()
        .ref(`${this.currentUser}/memos`)
        .push(memoData)
        .then(function() {
          that.collectionViewDisplay = true;
          that.singleViewDisplay = !that.isMobileDevice;
          that.singleViewMode ="View";
          that.memoAlert = false;
          that.memoHelpText = "";
          that.addMemoTitle = "";
          that.addMemoDetails = "";
          that.setCurrentMemo();
        })
        .catch(function(error) {
          console.error('エラー', error);
        })
    },
    // メモの編集画面 =============== Memo.Edit
    editMemoSubmit: function() {
      this.editMemoTitle = this.currentMemoTitle;
      this.editMemoDetails = this.currentMemoDetails;
      this.collectionViewDisplay = !this.isMobileDevice;
      this.singleViewDisplay = true;
      this.singleViewMode = "Edit";
      // インプットボックスにフォーカスを移動
      this.$nextTick(function() {
        this.$refs.editMemoTitle.focus();
      });
    },
    // メモの更新保存 =============== Memo.Update
    updateMemoSubmit: function() {
      firebase
        .database()
        .ref(`${this.currentUser}/memos/${this.currentMemoId}`)
        .update({
          title: this.editMemoTitle,
          details: this.editMemoDetails,
          updatedAt: firebase.database.ServerValue.TIMESTAMP,
        });
      
      // memosの内容を更新
      let that = this;
      const target = Object(that.memos).find(function(el) {
        return (el.id === that.currentMemoId);
      });
      
      firebase
        .database()
        .ref(`${this.currentUser}/memos/${this.currentMemoId}`)
        .on('value', function(memoSnapshot) {
          const lomemoData = memoSnapshot.val();
          target.title = lomemoData.title;
          target.details = lomemoData.details;
          target.updatedAt = lomemoData.updatedAt;
        });
      this.collectionViewDisplay = true;
      this.singleViewDisplay = !this.isMobileDevice;
      this.singleViewMode = "View";
      this.setCurrentMemo();
    },
    // メモの削除 ==================== Memo.Delete
    deleteMemoSubmit: function() {
      let that = this;
      const deleteMemoId = that.currentMemoId;
      // 削除した時はひとつ上のメモにカレントメモを移動
      let currentIndex = Number(that.currentMemoIndexOf);
      if (currentIndex > 0) {
        currentIndex--;
        that.currentMemoId = that.memos[currentIndex].id;
      } else {
        if (that.memos.length > 1) {
          that.currentMemoId = that.memos[1].id;
        } else {
          that.currentMemoId = "";
        }
      }
      firebase
        .database()
        .ref(`${that.currentUser}/memos/${deleteMemoId}`)
        .remove();
      this.collectionViewDisplay = true;
      this.singleViewDisplay = !this.isMobileDevice;
      this.singleViewMode = "View";
    },
  },
  created: function() {
    let that = this;
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        that.currentUser = user.uid;
        that.onLogin();
      } else {
        this.currentUser = null;
        that.onLogout();
      } 
    });
  }
})