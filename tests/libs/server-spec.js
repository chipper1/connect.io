import Port from '../../libs/port';
import Server from '../../libs/server';

const {Port:ChromePort} = chrome.__types;

describe( 'Server 构造函数' , ()=> {

  describe( '在接收到客户端的连接时' , ()=> {
    let server , onConnect , onConnectExternal , chromePort;

    beforeAll( ()=> { // onConnect 只会注册一次
      spyOn( chrome.runtime.onConnect , 'addListener' ).and.callFake( cb => onConnect = cb );
      spyOn( chrome.runtime.onConnectExternal , 'addListener' ).and.callFake( cb => onConnectExternal = cb );
      server = new Server( 'test namespace' ); // 相同命名空间的 server 也只会被初始化一次
    } );

    beforeEach( ()=> {
      chromePort = new ChromePort();
      spyOn( server , 'emit' );
    } );

    it( '若 port 来自外部连接，则 external 属性为 true' , ()=> {
      const s = new Server( 'external namespace' );
      const cp = new ChromePort();
      cp.name = '{"_namespace":"external namespace"}';
      onConnectExternal( cp );
      expect( s.ports[ 0 ].exteranl ).toBe( true );
    } );

    it( '若 port.name 不是 JSON 则不作任何处理' , ()=> {
      chromePort.name = 'not json';
      onConnect( chromePort );
      expect( server.emit ).not.toHaveBeenCalled();
    } );

    it( '若 port 没有 _namespace 属性则不作任何处理' , ()=> {
      chromePort.name = '{"some":"others"}';
      onConnect( chromePort );
      expect( server.emit ).not.toHaveBeenCalled();
    } );

    it( '若 port 的 _namespace 不存在则断开连接' , ()=> {
      chromePort.name = '{"_namespace":"have no"}';
      spyOn( chromePort , 'disconnect' );
      onConnect( chromePort );
      expect( chromePort.disconnect ).toHaveBeenCalled();
      expect( server.emit ).not.toHaveBeenCalled();
    } );

    describe( '若 port 的 _namespace 存在' , ()=> {
      let port;
      beforeEach( ()=> {
        chromePort.name = '{"_namespace":"test namespace"}';
        onConnect( chromePort );
        port = server.ports[ 0 ];
      } );

      afterEach( ()=> {
        server.ports = [];
      } );

      it( '对应的 server 会触发 connect 事件' , ()=> {
        expect( server.emit ).toHaveBeenCalledWith( 'connect' , port );
      } );

      it( '连接断开时，会从 ports 数组中删除此连接' , ()=> {
        port.disconnect();
        expect( server.ports.length ).toBe( 0 );
      } );

      it( 'port 会得到 broadcast 方法' , ()=> {
        const fakePort = new Port( new ChromePort() );
        server.ports.push( fakePort );
        spyOn( fakePort , 'send' );
        spyOn( port , 'send' );
        port.broadcast( 'x' , 'y' );
        expect( fakePort.send ).toHaveBeenCalledWith( 'x' , 'y' );
        expect( port.send ).not.toHaveBeenCalled();
      } );

      it( 'server.send 会给所属的每个连接发送消息' , ()=> {
        spyOn( port , 'send' );
        server.send( 'x' , 'y' );
        expect( port.send ).toHaveBeenCalledWith( 'x' , 'y' );
      } );
    } );

    it( '不会重复初始化相同命名空间的 Server' , ()=> {
      const s = new Server( 'test namespace' );
      expect( s ).toBe( server );
    } );
  } );
} );
