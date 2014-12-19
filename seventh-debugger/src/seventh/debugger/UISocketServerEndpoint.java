/*
 * see license.txt 
 */
package seventh.debugger;

import java.io.IOException;

import javax.websocket.EndpointConfig;
import javax.websocket.OnClose;
import javax.websocket.OnError;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

/**
 * Negotiates between the client UI and the server passing debug information
 * 
 * @author Tony
 *
 */
@ServerEndpoint(value = "/server")
public class UISocketServerEndpoint {

	/**
	 * Message queue
	 */
	public static final String MESSAGE_QUEUE="queue";
	private Session session;
	
	private SeventhDebugger debugger;
	
	/**
	 * 
	 */
	public UISocketServerEndpoint() {
	}
	
	/**
	 * Sends a message to the client
	 * 
	 * @param message
	 */
	public void sendMessage(String message) {
		try {
			this.session.getBasicRemote().sendText(message);
		} 
		catch (IOException e) {
			e.printStackTrace();
		}
	}

	@OnMessage
	public void onMessage(Session session, String message) {			
	}
	
	@OnOpen
	public void onOpen(Session session, EndpointConfig config) {
		this.session = session;
		this.debugger = (SeventhDebugger)config.getUserProperties().get(MESSAGE_QUEUE);
		if(this.debugger != null) {
			this.debugger.addWebSocketClient(this);
		}
	}
	
	@OnClose
	public void onClose(Session session) {
		if(this.debugger != null) {
			this.debugger.removeWebSocketClient(this);
		}
	}
	
	@OnError
	public void onError(Session session, Throwable cause) {		
	}
}
