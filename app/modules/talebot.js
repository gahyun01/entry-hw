const BaseModule = require('./baseModule');

class Ozobot extends BaseModule {
    // 클래스 내부에서 사용될 필드들을 이곳에서 선언합니다.
    constructor() {
        super();
        this.sp = null;     //serial port
        this.dataFormat = {
            fheader: 0xFF,
            sheader: 0x55,
            data_size: 0,
            index: 0,
            data: [],
            tail: 0x0A,
        };
        this.entryData = {
            seq: 0,
            cat: 0,
            act: 0,
            pcnt: 0,
            p1: 0,
            p2: 0,
            p3: 0,
            p4: 0,
            p5: 0,
            p6: 0,
        };
        this.commands = {
            CMD_SEQ: 'seq',
            CMD_CATEGORY: 'cat',
            CMD_ACTION: 'act',
            CMD_PARAM_CNT: 'pcnt',
            CMD_PARAM_1: 'p1',
            CMD_PARAM_2: 'p2',
            CMD_PARAM_3: 'p3',
            CMD_PARAM_4: 'p4',
            CMD_PARAM_5: 'p5',
            CMD_PARAM_6: 'p6',
        };
        this.sensorData = {
            done: 0,
        };
        this.sendBuffer = [];
        this.recvBuffer = [];
        this.sendSem = false;
        this.recvFlg = 0;
        this.recvIsFirst = false;
        this.buffer = [];
        this.currentSeq = 0;
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
    requestInitialData() {
        return true;
    }
    // 연결 후 초기에 수신받아서 정상연결인지를 확인해야하는 경우 사용합니다.
    checkInitialData(data, config) {
        return true;
    }
    // 주기적으로 하드웨어에서 받은 데이터의 검증이 필요한 경우 사용합니다.
    validateLocalData(data) {
        return true;
    }
    requestLocalData() {
        // 하드웨어로 보낼 데이터 로직
        if (!this.sendSem && this.sendBuffer.length > 0) {
            this.sendSem = true;
            this.sp.write(this.sendBuffer.shift(), () => {
                if (this.sp) {
                    this.sp.drain(() => {
                        this.sendSem = false;
                        this.sendBuffer = [];
                    });
                }
            });
        }
    }
    // 하드웨어에서 온 데이터 처리
    handleLocalData(data) {
        // 데이터 처리 로직
        if (data.length > 0) {
            const dataFormat = this.dataFormat;
            let bytes = [];
            let c = 0;
            for (bytes = [], c = 0; c < data.length; c += 2) {
                bytes.push(parseInt(data.substr(c, 2), 16));
            }
            for (let i = 0; i < bytes.length; i++) {
                if ((!this.recvIsFirst) && (bytes[i] != dataFormat.fheader)) {
                    continue;
                } else {
                    this.recvIsFirst = true;
                }
                this.recvBuffer.push(bytes[i]);
            }
            if (this.recvBuffer.shift() == dataFormat.fheader && this.recvFlg == 0) {
                this.recvFlg = 1;
            } else {
                this.recvFlg = 0;
                return;
            }
            if (this.recvBuffer.shift() == dataFormat.sheader && this.recvFlg == 1) {
                this.recvFlg = 2;
            } else {
                this.recvFlg = 0;
                return;
            }
            if (this.recvBuffer[0] + 2 == this.recvBuffer.length) {
                this.recvFlg = 3;
                dataFormat.data_size = this.recvBuffer.shift();
            } else {
                this.recvFlg = 0;
                return;
            }
            dataFormat.data = [];
            for (let i = 0; i < dataFormat.data_size; i++) {
                // 센서 데이터 처리
                dataFormat.data.push(this.recvBuffer.shift());
            }
            if (this.recvBuffer.shift() == dataFormat.tail && this.recvFlg == 3) {
                this.recvFlg = 0;
            } else {
                this.recvFlg = 0;
                dataFormat.data = [];
                return;
            }
            if (dataFormat.data[0] == 0x00) {
                const seq = ((dataFormat.data[1] << 8) | dataFormat.data[2]);
                if (this.currentSeq == seq) {
                    this.sensorData.done = dataFormat.data[3];
                } else {
                    this.sensorData.done = 0;
                }
            }
        }
    }
    // 엔트리로 전달할 데이터
    requestRemoteData(handler) {
        // handler.write(key, value) ...
        Object.keys(this.sensorData).forEach((key) => {
            if (this.sensorData[key] !== undefined) {
                handler.write(key, this.sensorData[key]);
            }
        });
    }
    // 엔트리에서 받은 데이터에 대한 처리
    handleRemoteData(handler) {
        // const value = handler.read(key) ...
        const entryData = this.entryData;
        const buffer = [];
        entryData.seq = handler.read(this.commands.CMD_SEQ);
        if (entryData.seq == 0) {
            if (this.currentSeq != 0) {
                this.sendBuffer.push([0xFF, 0x55, 0x04, 0x02, 0x00, 0x00, 0x00, 0x0A]);
            }
            this.currentSeq = 0;
        } else {
            if (this.currentSeq == entryData.seq) {
                return;
            }
            this.currentSeq = entryData.seq;
            if (handler.e(this.commands.CMD_CATEGORY)) {
                entryData.cat = handler.read(this.commands.CMD_CATEGORY);
            }
            if (handler.e(this.commands.CMD_ACTION)) {
                entryData.act = handler.read(this.commands.CMD_ACTION);
            }
            if (handler.e(this.commands.CMD_PARAM_CNT)) {
                entryData.pcnt = handler.read(this.commands.CMD_PARAM_CNT);
            }
            if (handler.e(this.commands.CMD_PARAM_1)) {
                entryData.p1 = handler.read(this.commands.CMD_PARAM_1);
            }
            if (handler.e(this.commands.CMD_PARAM_2)) {
                entryData.p2 = handler.read(this.commands.CMD_PARAM_2);
            }
            if (handler.e(this.commands.CMD_PARAM_3)) {
                entryData.p3 = handler.read(this.commands.CMD_PARAM_3);
            }
            if (handler.e(this.commands.CMD_PARAM_4)) {
                entryData.p4 = handler.read(this.commands.CMD_PARAM_4);
            }
            if (handler.e(this.commands.CMD_PARAM_5)) {
                entryData.p5 = handler.read(this.commands.CMD_PARAM_5);
            }
            if (handler.e(this.commands.CMD_PARAM_6)) {
                entryData.p6 = handler.read(this.commands.CMD_PARAM_6);
            }
            switch (entryData.cat) {
                case 0x01: // movement
                    buffer.push(entryData.cat);
                    buffer.push(((entryData.seq) & 0xFF00) >> 8);
                    buffer.push((entryData.seq) & 0xFF);
                    switch (entryData.act) {
                        case 0x00: // wheel
                            buffer.push(entryData.act);
                            buffer.push(entryData.p1);
                            buffer.push(entryData.p2);
                            buffer.push(entryData.p3);
                            buffer.push(entryData.p4);
                            break;
                        case 0x01: // forward/backward
                            buffer.push(entryData.act);
                            buffer.push(entryData.p1);
                            buffer.push(((entryData.p2) & 0xFF00) >> 8);
                            buffer.push((entryData.p2) & 0xFF);
                            break;
                        case 0x02: // rotate
                            buffer.push(entryData.act);
                            buffer.push(entryData.p1);
                            buffer.push(((entryData.p2) & 0xFF00) >> 8);
                            buffer.push((entryData.p2) & 0xFF);
                            break;
                        case 0x03:
                            buffer.push(entryData.act);
                            buffer.push(entryData.p1);
                            break;
                        default:
                    }
                    break;
                case 0x02: // control
                    buffer.push(entryData.cat);
                    buffer.push(((entryData.seq) & 0xFF00) >> 8);
                    buffer.push((entryData.seq) & 0xFF);
                    switch (entryData.act) {
                        case 0x00: // force stop
                            buffer.push(entryData.act);
                            break;
                        case 0x01: // led
                            switch (entryData.p1) {
                                case 0x00:
                                    buffer.push(entryData.act);
                                    buffer.push(entryData.p1);
                                    buffer.push((entryData.p2 & 0xFF0000) >> 16);
                                    buffer.push((entryData.p2 & 0xFF00) >> 8);
                                    buffer.push((entryData.p2 & 0xFF));
                                    break;
                                case 0x01:
                                    buffer.push(entryData.act);
                                    buffer.push(entryData.p1);
                                    buffer.push(entryData.p2);
                                    buffer.push((entryData.p3 & 0xFF0000) >> 16);
                                    buffer.push((entryData.p3 & 0xFF00) >> 8);
                                    buffer.push((entryData.p3 & 0xFF));
                                    break;
                                case 0x02:
                                    buffer.push(entryData.act);
                                    buffer.push(entryData.p1);
                                    buffer.push((entryData.p2 & 0xFF0000) >> 16);
                                    buffer.push((entryData.p2 & 0xFF00) >> 8);
                                    buffer.push((entryData.p2 & 0xFF));
                                    break;
                            }
                            break;
                        case 0x02: // music
                            switch (entryData.p1) {
                                case 0x00: // select instruments
                                    buffer.push(entryData.act);
                                    buffer.push(entryData.p1);
                                    buffer.push(entryData.p2);
                                    break;
                                case 0x01:
                                    buffer.push(entryData.act);
                                    buffer.push(entryData.p1);
                                    buffer.push(entryData.p2);
                                    buffer.push(entryData.p3);
                                    buffer.push((entryData.p4 & 0xFF00) >> 8);
                                    buffer.push((entryData.p4 & 0xFF));
                                    break;
                                case 0x02:
                                    break;
                            }
                            break;
                        case 0x03: // dance
                            buffer.push(entryData.act);
                            buffer.push(entryData.p1);
                            break;
                        case 0x04: // record
                            buffer.push(entryData.act);
                            buffer.push(entryData.p1);
                            break;
                        case 0x05: // volume
                            buffer.push(entryData.act);
                            buffer.push(entryData.p1);
                            break;
                        case 0x06: // sound
                            buffer.push(entryData.act);
                            buffer.push(entryData.p1);
                            break;
                        default:
                    }
                    break;
                default:
                    // error
                    return;
            }
            buffer.unshift(this.dataFormat.fheader, this.dataFormat.sheader, buffer.length);
            buffer.push(this.dataFormat.tail);
            this.sendBuffer.push(buffer);
        }
    }
}
module.exports = new Ozobot();
