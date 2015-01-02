/*
 * See license.txt
 */
package seventh.debugger;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadFactory;
import java.util.concurrent.TimeUnit;

import javax.websocket.Decoder;
import javax.websocket.Encoder;
import javax.websocket.Extension;
import javax.websocket.server.ServerContainer;
import javax.websocket.server.ServerEndpointConfig;

import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.DefaultHandler;
import org.eclipse.jetty.server.handler.HandlerList;
import org.eclipse.jetty.server.handler.ResourceHandler;
import org.eclipse.jetty.servlet.DefaultServlet;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.webapp.WebAppContext;
import org.eclipse.jetty.websocket.jsr356.server.deploy.WebSocketServerContainerInitializer;

import seventh.server.ServerSeventhConfig;
import seventh.shared.Debugable;
import seventh.shared.Debugable.DebugInformation;
import seventh.shared.Debugable.DebugableListener;

/**
 * The seventh remote debugger
 * 
 * @author Tony
 *
 */
public class SeventhDebugger implements DebugableListener {
	

	/**
	 * For testing purposes
	 * 
	 * @param args
	 * @throws Exception
	 */
	public static void main(String[] args) throws Exception {
		int port = 8088;
		if(args.length > 0) {
			port = Integer.parseInt(args[0]);
		}
		
		SeventhDebugger d = new SeventhDebugger();
		d.start(port);
	}
	
	
	private Server server;
	private Queue<Debugable> debugQ;
	private ScheduledExecutorService executorService;
	
	private Queue<UISocketServerEndpoint> clients;
	
	private Runnable updateWorker = new Runnable() {
		
		@Override
		public void run() {
			while(!debugQ.isEmpty()) {
				Debugable debugable = debugQ.poll();
				DebugInformation information = debugable.getDebugInformation();
				String jsonMessage = information.toString();
				
				/* send the payload to all connected clients */
				for(UISocketServerEndpoint client : clients) {
					client.sendMessage(jsonMessage);
				}
			}
		}
	};
	
	/**
	 * Handles
	 */
	public SeventhDebugger() {
		// Set JSP to use Standard JavaC always
        System.setProperty("org.apache.jasper.compiler.disablejsr199","false");
		
		this.debugQ = new ConcurrentLinkedQueue<>();
		this.clients = new ConcurrentLinkedQueue<>();
		this.executorService = Executors.newScheduledThreadPool(2, new ThreadFactory() {
			
			@Override
			public Thread newThread(Runnable r) {
				Thread thread = new Thread(r, "seventh-debug-queue");
				thread.setDaemon(true);
				return thread;
			}
		});
	}

	/**
	 * Adds the client
	 * 
	 * @param client
	 */
	public void addWebSocketClient(UISocketServerEndpoint client) {
		this.clients.add(client);
	}
	
	/**
	 * Removes the client
	 * 
	 * @param client
	 */
	public void removeWebSocketClient(UISocketServerEndpoint client) {
		this.clients.remove(client);
	}
	
	/* (non-Javadoc)
	 * @see seventh.shared.Debugable.DebugableListener#onDebugable(seventh.shared.Debugable)
	 */
	@Override
	public void onDebugable(Debugable debugable) {	
		this.debugQ.add(debugable);
	}
	
	/* (non-Javadoc)
	 * @see seventh.shared.Debugable.DebugableListener#init(seventh.server.ServerSeventhConfig)
	 */
	@Override
	public void init(final ServerSeventhConfig config) throws Exception {
		
		executorService.submit(new Runnable() {
			
			@Override
			public void run() {
				try {
					start(config.getConfig().getStr("./web", "debugger", "resourceBase"),
						  config.getConfig().getInt("debugger", "port"));
				}
				catch(Exception e) {
					e.printStackTrace();
				}
			}
		});
	}
	
	
	/**
	 * Starts the debugger with the resource base pointed to the ./web
	 * 
	 * @param port
	 * @throws Exception
	 */
	public void start(int port) throws Exception {
		start("./web", port);
	}
	
	/**
	 * Starts the debugger
	 * 
	 * @param port
	 * @param resourceBase the file path to the base directory of the web components
	 * @throws Exception
	 */
	public void start(String resourceBase, int port) throws Exception {
		executorService.scheduleAtFixedRate(updateWorker, 0, 33, TimeUnit.MILLISECONDS);
		
		server = new Server(port);
		
		String contextPath = "/seventh";
		//String resourceBase = "C:\\JavaProjects\\seventh-debugger/web";
		
		HandlerList handlers = new HandlerList();
		server.setHandler(handlers);
		
		ServletContextHandler servletContext = new ServletContextHandler(ServletContextHandler.SESSIONS);
		servletContext.setContextPath(contextPath);
		servletContext.setResourceBase(resourceBase);
//        server.setHandler(servletContext);
		handlers.addHandler(servletContext);
				
		ServerContainer wsContainer = WebSocketServerContainerInitializer.configureContext(servletContext);
		wsContainer.addEndpoint(new ServerEndpointConfig() {
			
			@Override
			public Map<String, Object> getUserProperties() {
				Map<String, Object> map = new HashMap<String, Object>();
				map.put(UISocketServerEndpoint.MESSAGE_QUEUE, SeventhDebugger.this);
				return map;
			}
			
			@Override
			public List<Class<? extends Encoder>> getEncoders() {
				return null;
			}
			
			@Override
			public List<Class<? extends Decoder>> getDecoders() {
				return null;
			}
			
			@Override
			public List<String> getSubprotocols() {
				return null;
			}
			
			@Override
			public String getPath() {
				return "/server";
			}
			
			@Override
			public List<Extension> getExtensions() {
				return null;
			}
			
			@Override
			public Class<?> getEndpointClass() {
				return UISocketServerEndpoint.class;
			}
			
			@Override
			public Configurator getConfigurator() {
				return null;
			}
		});
		
		WebAppContext webContext = new WebAppContext();
		webContext.setInitParameter("org.eclipse.jetty.servlet.Default.useFileMappedBuffer", "false");
		webContext.setContextPath("/debugger");
		webContext.setResourceBase(resourceBase);
		
		ServletHolder defaultHolder = new ServletHolder(new DefaultServlet());
		defaultHolder.setInitParameter("org.eclipse.jetty.servlet.Default.useFileMappedBuffer", "false");		
		webContext.addServlet(defaultHolder, "/");
						
		ResourceHandler resourceContext = new ResourceHandler();
		resourceContext.setResourceBase(resourceBase);
        resourceContext.setDirectoriesListed(true);
        
        handlers.addHandler(resourceContext);
        handlers.addHandler(webContext);
        handlers.addHandler(new DefaultHandler());
		
        
		server.start();
		server.join();
	}
	
	/**
	 * Stops the debugger
	 */
	@Override
	public void shutdown() {
		try {
			if(server != null) {		
				server.stop();
				server.destroy();
			}
			
			this.executorService.shutdownNow();
		}
		catch(Exception e) {
			e.printStackTrace();
		}
	}

}
