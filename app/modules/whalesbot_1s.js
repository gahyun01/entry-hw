const BaseModule = require('./baseModule');

class whalesbot_1s extends BaseModule {
    
    // 클래스 내부에서 사용될 필드들을 이곳에서 선언합니다.
    constructor() {
        super();
        this.sp = null;     //serial port
        
        this.foo = 0;
        // ...
    }
    
    init(handler, config) {
        this.handler = handler;
        this.config = config;
    }

    setSerialPort(sp) {
        this.sp = sp;
    }

    disconnect(connect) {
        connect.close();
        if (this.sp) {
            delete this.sp;
        }
    }
    
    /*
    연결 후 초기에 송신할 데이터가 필요한 경우 사용합니다.
    requestInitialData 를 사용한 경우 checkInitialData 가 필수입니다.
    이 두 함수가 정의되어있어야 로직이 동작합니다. 필요없으면 작성하지 않아도 됩니다.
    */
    requestInitialData() {
        // return true;
    }
    
    // 연결 후 초기에 수신받아서 정상연결인지를 확인해야하는 경우 사용합니다.
    checkInitialData(data, config) {
        // return true;
    }
    
    // 주기적으로 하드웨어에서 받은 데이터의 검증이 필요한 경우 사용합니다.
    validateLocalData(data) {
        // return true;
    }
    
    /*
    하드웨어 기기에 전달할 데이터를 반환합니다.
    slave 모드인 경우 duration 속성 간격으로 지속적으로 기기에 요청을 보냅니다.
    */
    requestLocalData() {
        // 하드웨어로 보낼 데이터 로직
    }
    
    // 하드웨어에서 온 데이터 처리
    handleLocalData(data) {
        // 데이터 처리 로직
    }
    
    // 엔트리로 전달할 데이터
    requestRemoteData(handler) {
        // handler.write(key, value) ...
    }
    
    // 엔트리에서 받은 데이터에 대한 처리
    handleRemoteData(handler) {
        // const value = handler.read(key) ...
    }
}

module.exports = new [모듈명]();