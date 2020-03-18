import { Injectable } from "@angular/core";
import { Platform } from '@ionic/angular';
import { CarrierService } from 'src/app/services/CarrierService';
import { Events } from '@ionic/angular';
import { JsonRPCService } from 'src/app/services/JsonRPCService';
import { TransportService } from 'src/app/services/TransportService';
import { StorageService } from 'src/app/services/StorageService';


@Injectable()
export class Friend{
  constructor(
      public userId: string,
      // public address: string,
      public email: string,
      public region: string,
      public name: string,
      public status: ConnState) {}
}

enum ConnState {
  connected = 0,
  disconnected = 1
};

enum MethodType {
  subscribe = "0",
  unsubscribe = "1",
  exploreTopics = "2",
  listSubscribed = "3",
  fetchUnreceived = "4",

  createTopic = "11",
  postEvent = "12",
  listOwnedTopics = "13",
}

enum PersistenceKey{
  firstInit = "firstInit",

  serverList = "serverList",
  serverMap = "serverMap",

  favoriteFeedList = "favoriteFeedList",
  favoriteFeedMap = "favoriteFeedMap",

  allFeedList = "allFeedList",
  allFeedMap = "allFeedMap",

  // faverFeedList = "faverFeedList",
  // feedDescList = "feedDescList",

  eventList = "eventList",
  eventMap = "eventMap",

  myFeedList = "virtrulMyFeeds",
  myFeedMap = "myFeedMap",

  // {nodeId+topic:{event}}
  myEventMap = "myEventMap",

  exploreFeedList = "exploreFeedList"
}

// let serverUserIdList:any = [];
let connectionStatus = ConnState.disconnected;
// let serverList: Friend[] = [];
let serverList: string[] = [];
let serverMap: {} = {};

// let faverFeedList: FavoriteFeed[] = [];
let favoriteFeedList: string[] = [];
let favoriteFeedMap:{} = {};

let allFeedList: string[] = [];
let allFeedMap: {} = {};

// let exploreFeedList: FeedDescs[] = [];

let eventList: string[] = [];
let eventMap: {} = {};

let myFeedList: string[] = [];
let myFeedMap: {} = {};

let myEventMap: {} = {};
// let eventsMap:{topic: string, eventList: FeedEvents[]};
let firstInit: boolean;
let needFetch: boolean = true;
let firstListMyFeed: boolean = true;

let eventBus = null;
let fetchTopic:string ;
let unSubscribeTopic: string = "";
let subscribeTopic: string = "";
let currentFeedEventKey: string = "";
let currentCreateTopicNID = "";

let postEventTmp: FeedEvents;

@Injectable()
export class FavoriteFeed {
  constructor(
    public nodeId: string,
    public name: string,
    public desc: string,
    public unread: number,
    public lastSeqno: number,
    public lastReceived: string = '') {}
}

export class AllFeed{
  constructor(
    public nodeId: string,
    public avatar: string,
    public topic: string,
    public desc: string,
    public followState: string){
  }
}

export class MyFeed {
  constructor(
    public avatar: string,
    public nodeId: string,
    public name: string,
    public desc: string,
    public lastUpdated: string) {}
}

// export class FeedDescs{
//   constructor(
//     public nodeId: string,
//     public avatar: string,
//     public topic: string,
//     public desc: string,
//     public followState: string
//     ){
//   }
// }

export class FeedEvents{
  constructor(
    public nodeId: string,
    public topic: string,
    public timestamp: string,
    public message: string,
    public seqno: number){
  }
}

export class FeedIntro{
  constructor(public description: string){
  }
}

@Injectable()
export class FeedService {
  public constructor(
    private platform: Platform,
    private events: Events,
    private jsonRPCService: JsonRPCService,
    private transportService: TransportService,
    private carrierService: CarrierService,
    private storeService: StorageService) {
      eventBus = events;
      this.init();
  }

  init(){
    if (this.platform.is('desktop')) {
      serverList = virtualServerList;
      serverMap = virtualServersMap;

      favoriteFeedList = virtualFFList;
      favoriteFeedMap = virtualFFMap;

      allFeedList = virtualAFList;
      allFeedMap = virtualAFMap;

      eventList = virtualEventList;
      for (let index = 0; index < eventList.length; index++) {
        eventMap[eventList[index]] = virtrulFeedEvents;
      }
      // exploreFeedList = virtrulFeedDescs;

      myFeedList = virtualMyFeedList;
      myFeedMap = virtrulMyFeeds;

      myEventMap = virtualMyEventMap;

      return;
    }

    this.initData();

    this.initCallback();
  }

  initData(){
    firstInit = this.storeService.get(PersistenceKey.firstInit);
    firstInit = true; // for test
    if (firstInit == null) {
      firstInit = true;
    }

    serverList = this.storeService.get(PersistenceKey.serverList);
    if (serverList == null || serverList == undefined) {
      serverList = [];
    }
    serverMap = this.storeService.get(PersistenceKey.serverMap);
    if (serverMap == null || serverMap == undefined){
      serverMap = {};
    }


    favoriteFeedList = this.storeService.get(PersistenceKey.favoriteFeedList);
    if (favoriteFeedList == null || favoriteFeedList == undefined) {
      favoriteFeedList = [];
    }
    favoriteFeedMap = this.storeService.get(PersistenceKey.favoriteFeedMap);
    if (favoriteFeedMap == null || favoriteFeedMap == undefined) {
      favoriteFeedMap = {};
    }

    allFeedList = this.storeService.get(PersistenceKey.allFeedList);
    if (allFeedList == null || allFeedList == undefined) {
      allFeedList = [];
    }
    allFeedMap = this.storeService.get(PersistenceKey.allFeedMap);
    if (allFeedMap == null || allFeedMap == undefined) {
      allFeedMap = [];
    }
    
    eventList = this.storeService.get(PersistenceKey.eventList);
    if (eventList == null || eventList == undefined){
      eventList = [];
    }
    eventMap = this.storeService.get(PersistenceKey.eventMap);
    if (eventMap == null || eventMap == undefined){
      eventMap = {};
    }
    
  }

  initCallback(){
    this.carrierReadyCallback();
    this.friendAddCallback();
    this.friendConnectionCallback();
    this.friendMessageCallback();
    this.connectionChangedCallback();
  }

  prepare(){
    this.carrierService.getFriends(
        (ret) => {
          this.parseFriends(ret, serverList, serverMap);
          // serverList = this.parseFriends(ret);
          
          this.doListSubscribedTopics(serverList, serverMap);
          // this.storeService.set(PersistenceKey.serverList,serverList);
          // this.storeService.set(PersistenceKey.serverMap,serverMap);


          if (firstListMyFeed){
            for (let index = 0; index < serverList.length; index++) {
              this.listOwnedTopics(serverMap[serverList[index]].userId);
            }
            firstListMyFeed = false ;
          }
        },
        null);

    
  }

  getConnectionStatus() {
    return connectionStatus;
  }

  getServerList(): Friend[]{
    let list: Friend[] = [];
    for (let index = 0; index < serverList.length; index++) {
      list.push(serverMap[serverList[index]]);
    }
    return list;
  }

  getFavoriteFeeds() {
    let list: FavoriteFeed[] = [];
    for (let index = 0; index < favoriteFeedList.length; index++) {
      list.push(favoriteFeedMap[favoriteFeedList[index]]);
    }
    return list;
  }

  public getAllFeeds() {
    let list: AllFeed[] = [];
    console.log('getAllFeeds'+JSON.stringify(allFeedMap));
    for (let index = 0; index < allFeedList.length; index++) {
      list.push(allFeedMap[allFeedList[index]]);
    }
    return list;
  }

  public getFeedDescr(feedKey: string) {
    return allFeedMap[feedKey].desc;
  }

  fetchFeedEvents(nodeId: string, topic: string , seqno: number = -1){
    if (seqno!=-1){
      this.fetchUnreceived(nodeId,topic,seqno+1);
      return;
    }

    if (favoriteFeedList.indexOf(nodeId+topic) == -1){
      return ;
    }
    
    this.fetchUnreceived(nodeId,topic,favoriteFeedMap[nodeId+topic].lastSeqno+1);
  }

  public getFeedEvents(feedEventKey: string) {
    currentFeedEventKey = feedEventKey;
    let list: FeedEvents[] = [];
    for (let index = 0; index < eventMap[feedEventKey].length; index++) {
      list.push(eventMap[feedEventKey][index]);
    }

    return list.reverse();
  }



  public getMyFeeds() {
    let list: MyFeed[] = [];
    for (let index = 0; index < myFeedList.length; index++) {
      list.push(myFeedMap[myFeedList[index]]);
    }

    return list;
  }

  
  public getMyFeedEvents(nodeId: string, topic: string) {
    if (myEventMap == null || 
        myEventMap == undefined || 
        myEventMap[nodeId+topic] == null || 
        myEventMap[nodeId+topic] == undefined){
      return ;
    }
    return myEventMap[nodeId+topic];
  }


  updateServerList(serverList: string[], serverMap:any, server:Friend){
    if(serverList == null || serverList == undefined){
      return ;
    }
    
    let index = serverList.indexOf(server.userId);

    if (index == -1){
      serverList.push(server.userId);
      serverMap[server.userId] = server;
      return ;
    }

    serverMap[server.userId] = server;


    // for (let i = 0; i < serverList.length; i++) {
    //   let serverKey = serverList[]
    //   const server = serverList[i];
    //   if(server.userId == userId){
    //     server.status = connectStatus;
    //     return server;
    //   }
    // }
  }

  sendMessage(nodeId: string, method: string, params: any, id: string){
    if(!this.checkServerConnection(nodeId)){

      return;
    }

    let message = this.jsonRPCService.assembleJson(method, params, id);
    this.transportService.transportMsg(
      nodeId, 
      JSON.stringify(message), 
      ()=>{
        // alert("success")
      }, 
      (error)=>alert("error="+error));
  }
  
  //{"jsonrpc":"2.0","method":"create_topic","params":{"topic":"news","desc":"daily"},"id":null}
  createTopic(nodeId: string, topic: string, desc: string){
      currentCreateTopicNID = nodeId;
      let params = {};
      params["topic"] = topic;
      params["desc"] = desc;

      this.sendMessage(nodeId, "create_topic", params, MethodType.createTopic);
  }

  //{"jsonrpc":"2.0","method":"post_event","params":{"topic":"news","event":"newsevent"},"id":null}
  postEvent(nodeId: string, topic: string, event: string){
      let params = {};
      params["topic"] = topic;
      params["event"] = event;

      // public nodeId: string,
      // public topic: string,
      // public timestamp: string,
      // public message: string,
      // public seqno: number){

      let lastSeqno = 0;
      if (myEventMap[nodeId+topic] != null || myEventMap[nodeId+topic] != undefined){
        lastSeqno = myEventMap[nodeId+topic].seqno;
      }
        
      postEventTmp = new FeedEvents(nodeId,topic,this.getCurrentTime(),event,lastSeqno++);
      this.sendMessage(nodeId, "post_event", params, MethodType.postEvent);
  }

  //{"jsonrpc":"2.0","method":"list_owned_topics","id":null}
  listOwnedTopics(nodeId: string){
    this.sendMessage(nodeId, "list_owned_topics", null, MethodType.listOwnedTopics);
  }

  //{"jsonrpc":"2.0","method":"subscribe","params":{"topic":"movie"},"id":null}
  subscribe(nodeId: string, topic: string){
    let params = {};
    params["topic"] = topic;
    subscribeTopic = topic ;
    this.sendMessage(nodeId, "subscribe", params, MethodType.subscribe);
  }

  doSubscribe(){
    
    // this.subscribe();
  }

  //{"jsonrpc":"2.0","method":"unsubscribe","params":{"topic":"movie"},"id":null}
  unSubscribe(nodeId: string, topic: string){
      let params = {};
      params["topic"] = topic;
      unSubscribeTopic = topic;
      this.sendMessage(nodeId, "unsubscribe", params, MethodType.unsubscribe);
  }

  //{"jsonrpc":"2.0","method":"explore_topics","id":null}
  exploreTopics(nodeId: string){
      this.sendMessage(nodeId, "explore_topics", null, MethodType.exploreTopics);
  }

  doExploreTopics(){
    if (serverList == null || serverList == undefined){
      return ;
    }

    for (let index = 0; index < serverList.length; index++) {
      this.exploreTopics(serverList[index]);
    }
    // for (let index = 0; index < serverList.length; index++) {
    //   this.exploreTopics(serverList[index].userId);
    // }
  }

  //{"jsonrpc":"2.0","method":"list_subscribed_topics","id":null}
  listSubscribed(nodeId: string){
    this.sendMessage(nodeId, "list_subscribed_topics", null, MethodType.listSubscribed);
  }

  //{"jsonrpc":"2.0","method":"fetch_unreceived","params":{"topic":"movie","since":1021438976},"id":null}
  fetchUnreceived(nodeId: string, topic: string, since: number){
      fetchTopic = topic;
      let params = {};
      params["topic"] = topic;
      params["since"] = since;
      this.sendMessage(nodeId, "fetch_unreceived", params, MethodType.fetchUnreceived);
  }

  // parseFriends(data:any): Friend[]{
  //   let serverFriendList: Friend[] = [];
  //   let servers = data.friends;
  //       if (typeof servers == "string") {
  //         servers = JSON.parse(servers);
  //       }
  //       for (let id in servers) {
  //           let friend = new Friend(servers[id].userInfo.userId,
  //                                   servers[id].userInfo.name,
  //                                   servers[id].connection);
  //           serverFriendList.push(friend);
  //       }
  //   return serverFriendList;
  // }

  parseFriends(data:any , serverList: string[] , serverMap: any){
    // let serverFriendList: Friend[] = [];
    let servers = data.friends;
    console.log("000"+JSON.stringify(serverMap));
    console.log("000"+JSON.stringify(serverList));
    console.log("2222"+(typeof servers));
    if (typeof servers == "string") {
      servers = JSON.parse(servers);
    }

    console.log("2222");
    console.log("servers="+JSON.stringify(servers));
    for (let id in servers) {
      let friend = new Friend(servers[id].userInfo.userId,
                              // servers[id].userInfo.address,
                              servers[id].userInfo.email,
                              servers[id].userInfo.region,
                              servers[id].userInfo.name,
                              servers[id].connection);
      // let friend = new Friend(servers[id].userInfo.userId,
      //                         servers[id].userInfo.name,
      //                         servers[id].connection);

                              
      serverMap[servers[id].userInfo.userId] = friend;

      if (serverList.indexOf(servers[id].userInfo.userId) == -1){
        serverList.push(servers[id].userInfo.userId);
      }
    }

    this.storeService.set(PersistenceKey.serverList,serverList);
    this.storeService.set(PersistenceKey.serverMap,serverMap);

    console.log(JSON.stringify(serverMap));
    console.log(JSON.stringify(serverList));
  }

  // doListSubscribedTopics(serverList: Friend[]){
  //   for (let index = 0; index < serverList.length; index++) {
  //     const server = serverList[index];
  //     if (server.status == ConnState.connected) {
  //       this.listSubscribed(server.userId);
  //     }
  //   }
  // }

  doListSubscribedTopics(serverList: string[] , serverMap: any){
    if (serverList == null || serverList == undefined){
      return ;
    }

    for (let index = 0; index < serverList.length; index++) {
      const serverKey = serverList[index];
      if (serverMap[serverKey].status == ConnState.connected) {
        this.listSubscribed(serverMap[serverKey].userId);
      }
    }
  }

  doListSubscribedTopic(server: Friend){
    if (server.status == null || server.status == undefined){
      return ;
    }

    if (server.status == ConnState.connected) {
      this.listSubscribed(server.userId);
    }
  }

  findServer(nodeId: string):Friend{
    
    // if(serverList == null || serverList == undefined){
    //   return null;
    // }

    // let index = serverList.indexOf(nodeId);
    // if (index == -1){
    //   return null;
    // }
    
    if (serverMap == null || serverMap == undefined) {
      return undefined;
    }

    return serverMap[nodeId];
    // for (let index = 0; index < serverList.length; index++) {
    //   if (serverList[index].userId == nodeId){
    //     return serverList[index];
    //   }
    // }

    // return null;
  }

  carrierReadyCallback(){
    this.events.subscribe('carrier:ready', () => {
      if (firstInit) {
        this.prepare();
        // this.storeService.set(PersistenceKey.firstInit,false);
      }
    });
  }

  friendConnectionCallback(){
    this.events.subscribe('carrier:friendConnection', ret => {
      let friendId = ret.friendId;
      let friendStatus = ret.status;
      console.log("11111"+JSON.stringify(serverList));
      console.log("222"+JSON.stringify(serverMap));
      serverMap[friendId].status = friendStatus;
      if (serverMap[friendId].status == ConnState.connected){
        this.doListSubscribedTopic(serverMap[friendId]);
      }

      eventBus.publish('feeds:friendConnection',this.getServerList());
    });
  }

  friendAddCallback(){
    this.events.subscribe('carrier:friendAdded', msg => {
      let server: any;
      if (this.platform.is("desktop")) {
          server = new Friend('100', 
                              // 'New Address', 
                              'NewEmail@email.com', 
                              'beijing', 
                              'New Contact', 
                              ConnState.disconnected);
      } else {
          server = new Friend(
              msg.friendInfo.userInfo.userId,
              // msg.friendInfo.userInfo.address,
              msg.friendInfo.userInfo.email,
              msg.friendInfo.userInfo.region,
              msg.friendInfo.userInfo.name,
              msg.friendInfo.status);
      }

      serverList.push(server);
      this.storeService.set(PersistenceKey.serverList,serverList);
      eventBus.publish('feeds:updateServerList', serverList, Date.now());
    });
  }
  
  connectionChangedCallback(){
    this.events.subscribe('carrier:connectionChanged', status => {
      connectionStatus = status;
      eventBus.publish('feeds:connectionChanged', status, Date.now());
    });
  }

  handleResult(nodeId: string ,message: string){
    let from = nodeId;
    let response = this.jsonRPCService.parseJson(message);

    console.log("friendMessageCallback");
    console.log("response=>"+message);
    console.log("from=>"+from);
    console.log("ret=>"+response);

    if (this.jsonRPCService.checkError(message)) {
      alert(response.error.code+";"+response.error.message);
      return;
    }
    
    //TODO
    if (response.method == "new_event"){
        this.handleNewEventResult(from, response.params);
        return;
    }

    switch (response.id) {
      case MethodType.subscribe:
        console.log("subscribe response");
        this.handleSubscriptResult(from, response.result);
        break;
      case MethodType.unsubscribe:
        console.log("unsubscribe response");
        this.handleUnsubscribeResult(from, response.result);
        break;
      case MethodType.exploreTopics:
        console.log("exploreTopics response");
        this.handleExploreTopicResult(from, response.result);
        break;
      case MethodType.listSubscribed:
        console.log("listSubscribed response");
        this.handleListSubscribedResult(from, response.result);
        break;
      case MethodType.fetchUnreceived:
        console.log("fetchUnreceived response");
        this.handleFetchUnreceivedResult(from, response.result);
        break;
      case MethodType.createTopic:
        console.log("createTopic response");
        this.handleCreateTopicResult(response.result);
        break;
      case MethodType.postEvent:
        console.log("postEvent response");
        this.handlePostEventResult(response.result);
        break;
      case MethodType.listOwnedTopics:
        console.log("listOwnedTopics response");
        this.handleListOwnTopicResult(from, response.result);
        break;
      default:
        console.log("response id is "+response.id);
        break;
    }
  }

  friendMessageCallback(){
    this.events.subscribe('carrier:friendMessage', event => {
      this.handleResult(event.from, event.message);
    });
  }

  /*
  {
    "jsonrpc": "2.0",
    "result": NULL,
    "id": "id(JSON-RPC conformed type)"
  }

  {"jsonrpc":"2.0",
  "error":{"code":-32602,"message":"Operation Not Authorized"},"id":"11"}
  */
  handleCreateTopicResult(result: any){
    alert("create topic success");
    console.log("handleCreateTopicResult=>");

    eventBus.publish("feeds:createTopicSuccess");
    this.listOwnedTopics(currentCreateTopicNID);
    // myFeedMap.
  }

  /*
  {
    "jsonrpc": "2.0",
    "result": NULL,
    "id": "id(JSON-RPC conformed type)"
  } 
  */
  handlePostEventResult(result: any){
    alert("create event success");
    console.log("handlePostEventResult=>");

    if (myEventMap[postEventTmp.nodeId+postEventTmp.topic] == null || myEventMap[postEventTmp.nodeId+postEventTmp.topic] == undefined){
      myEventMap[postEventTmp.nodeId+postEventTmp.topic] = [];
    }
    
    myEventMap[postEventTmp.nodeId+postEventTmp.topic].push(postEventTmp);
    this.storeService.set(PersistenceKey.myEventMap,myFeedMap);

    eventBus.publish("feeds:postEventSuccess");
  }

  /*
  {
    "jsonrpc": "2.0",
    "result": [{
      "name": "topic名称(string)", 
      "desc": "topic描述(string)"
    }],
    "id": "id(JSON-RPC conformed type)"
  } 
  */
  handleListOwnTopicResult(nodeId: string, result: any){
    console.log("handleListOwnTopicResult=>");

    let changed = false ;
    for (let index = 0; index < result.length; index++) {
      let topic = result[index].name;
      let desc = result[index].desc;
      let feedKey = nodeId+topic;
      
      if(myFeedList.indexOf(feedKey) == -1){
        myFeedList.push(feedKey);
        myFeedMap[feedKey] = new MyFeed('paper',nodeId,topic,desc,new Date().getTime().toString());

        changed = true;
      }
    }

    if (changed){
      this.storeService.set(PersistenceKey.myFeedList, myFeedList);
      this.storeService.set(PersistenceKey.myFeedMap, myFeedMap);
      eventBus.publish("feeds:ownFeedListChanged",this.getMyFeeds());
    }
    
    

    myFeedList.push
  }

  /*
  {
    "jsonrpc": "2.0",
    "result": NULL,
    "id": "id(JSON-RPC conformed type)"
  }
  */
  handleSubscriptResult(nodeId: string, result: any){
    console.log("handleSubscriptResult=>");
    //local process or send listSubscribed request to server
    // TODO
    let server = this.findServer(nodeId);

    if (server == null || server == undefined){
      return ;
    }

    this.fetchFeedEvents(nodeId, subscribeTopic, 0);
    this.doListSubscribedTopic(server);
    allFeedMap[nodeId+subscribeTopic].followState = "following";
    eventBus.publish('feeds:allFeedsListChanged',this.getAllFeeds());

    // favoriteFeedList.push(nodeId+subscribeTopic);
    // favoriteFeedMap[]
    // subscribeTopic
    // favoriteFeedList.splice(favoriteFeedList.indexOf(nodeId+unSubscribeTopic),1);
    // favoriteFeedMap[nodeId+unSubscribeTopic] = undefined;
    // this.storeService.set(PersistenceKey.favoriteFeedList,favoriteFeedList);
    // this.storeService.set(PersistenceKey.favoriteFeedMap,favoriteFeedMap);
    // eventBus.publish('feeds:favoriteFeedListChanged',this.getFavoriteFeeds());
    // this.doListSubscribedTopic(server);
  }

  /*
  {
    "jsonrpc": "2.0",
    "result": NULL,
    "id": "id(JSON-RPC conformed type)"
  } 
  */
  handleUnsubscribeResult(nodeId: string,result: any){
    console.log("handleUnsubscribeResult=>");

    // TODO
    // faverFeedList.splice()
    favoriteFeedList.splice(favoriteFeedList.indexOf(nodeId+unSubscribeTopic),1);
    favoriteFeedMap[nodeId+unSubscribeTopic] = undefined;
    this.storeService.set(PersistenceKey.favoriteFeedList,favoriteFeedList);
    this.storeService.set(PersistenceKey.favoriteFeedMap,favoriteFeedMap);
    eventBus.publish('feeds:favoriteFeedListChanged',this.getFavoriteFeeds());

    allFeedMap[nodeId+unSubscribeTopic].followState = "follow";
    eventBus.publish('feeds:allFeedsListChanged',this.getAllFeeds());
    
    // let server = this.findServer(nodeId);

    // if (server == null || server == undefined){
    //   return ;
    // }


    // this.doListSubscribedTopic(server);
  }

  /*
  {
    "jsonrpc": "2.0",
    "result": [{
      "name": "topic名称(string)", 
      "desc": "topic描述(string)"
    }],
    "id": "id(JSON-RPC conformed type)"
  } 
  */
  handleExploreTopicResult(nodeId: string, result: any){
    let changed = false ;
    console.log("handleExploreTopicResult=>");

    if (result == "") {
      console.log("result null");
      return ;
    }

    for (let index = 0; index < result.length; index++) {
      let topic = result[index].name;
      let desc = result[index].desc;
      let feedKey = nodeId+topic;
      console.log(allFeedList.indexOf(feedKey));
      if (allFeedList.indexOf(feedKey) == -1){
        console.log("111111111111");
        console.log(JSON.stringify(allFeedMap));
        let feed = new AllFeed(nodeId,"paper",topic,desc,this.checkFollowState(feedKey));
        this.updateAllFeed(feedKey, feed);
        changed = true;
      } else {
        console.log(JSON.stringify(allFeedList));
        console.log("2222222222222");
        let followstate = this.checkFollowState(feedKey);
        console.log(followstate);
        console.log(JSON.stringify(allFeedMap));
        if (followstate != allFeedMap[feedKey].followState){
          let feed = allFeedMap[feedKey];
          feed.followState = followstate;
          this.updateAllFeedState(feedKey,feed);
          changed = true;
        }
      }
    }

    if (changed){
      eventBus.publish('feeds:allFeedsListChanged',this.getAllFeeds());
    }
  }

  
  /*
  {
    "jsonrpc": "2.0",
    "result": [{
      "name": "topic名称(string)", 
      "desc": "topic描述(string)"
    }],
    "id": "id(JSON-RPC conformed type)"
  } 
  */
  handleListSubscribedResult(nodeId: string, result: any){
    let changed = false ;
    console.log("handleListSubscribedResult=>");
    if (result == "") {
      console.log("result null");
      return ;
    }

    for (let index = 0; index < result.length; index++) {
      let topic = result[index].name;
      let desc = result[index].desc;

      let favoriteFeedKey = nodeId+topic;
      if (favoriteFeedList.indexOf(favoriteFeedKey) == -1){
        this.updatefavoriteFeed(favoriteFeedKey ,new FavoriteFeed(nodeId, topic, desc, 0, 0, new Date().getTime().toString()));
        changed = true ;
      }

      if (needFetch){
        this.fetchFeedEvents(nodeId, topic);
      }
    }
    needFetch = false ;
    if (changed){
      eventBus.publish('feeds:favoriteFeedListChanged',this.getFavoriteFeeds());
    }
  }

  updatefavoriteUnreadState(nodeId: string, topic: string , unread: number){
    favoriteFeedMap[nodeId+topic].unread = unread;
    this.storeService.set(PersistenceKey.favoriteFeedMap,favoriteFeedMap);
  }
  updatefavoriteFeed(favoriteFeedKey:string, feed:FavoriteFeed){
    favoriteFeedList.push(favoriteFeedKey);
    favoriteFeedMap[favoriteFeedKey] = feed;
    this.storeService.set(PersistenceKey.favoriteFeedList,favoriteFeedList);
    this.storeService.set(PersistenceKey.favoriteFeedMap,favoriteFeedMap);
  }

  updateAllFeed(feedKey: string, feed: AllFeed){
    allFeedList.push(feedKey);
    allFeedMap[feedKey] = feed;
    this.storeService.set(PersistenceKey.allFeedList,allFeedList);
    this.storeService.set(PersistenceKey.allFeedMap, allFeedMap);
  }

  updateAllFeedState(feedKey: string, feed: AllFeed){
    allFeedMap[feedKey] = feed;
    this.storeService.set(PersistenceKey.allFeedMap, allFeedMap);
  }
      // favoriteFeedMap[favoriteFeedKey].

      
      // faverMap[topic]=faverFeed;
      // console.log( Object.keys(faverMap) );
      
      // faverFeedList.push(faverFeed);
      // this.updateFavoriteFeedList(faverFeed, faverFeedList);
    // }
    
    // for(let key  in faverMap){
    //   console.log(key + '---' + faverMap[key])
    // }

    // TODO
    // checkList
    // let faverFeed = new FavoriteFeed(topic, desc, 0, new Date().getTime().toString());
    // faverFeedList.push(faverFeed);
  // }

  /*
  {
    "jsonrpc": "2.0",
    "result": [{
      "seqno": "序列号（以升序返回）(number)", 
      "event": "事件内容(string)",
      "ts": "事件发布时的时间戳（UNIX Epoch格式）(number)"
    }],
    "id": "id(JSON-RPC conformed type)"
  } 
  */
  handleFetchUnreceivedResult(from: string, result: any){
    let changed: boolean = false ;
    let currentEventChanged: boolean = false;
    console.log("handleFetchUnreceivedResult=>");
    if (result == null || result == undefined){
      return ;
    }

    for (let index = 0; index < result.length; index++) {
      let seqno = result[index].seqno;
      let event = result[index].event;
      let ts = result[index].ts;
      let eventKey = from+fetchTopic+event;

      if (eventList.indexOf(eventKey) == -1){
        let favoriteFeedKey = from+fetchTopic ;
        let unread = favoriteFeedMap[favoriteFeedKey].unread;
        favoriteFeedMap[favoriteFeedKey].lastSeqno = seqno;
        favoriteFeedMap[favoriteFeedKey].unread  = unread+1;
        favoriteFeedMap[favoriteFeedKey].lastReceived = ts;
        
        if (eventMap[favoriteFeedKey] == undefined){
          eventMap[favoriteFeedKey] = [];
        }
        eventList.push(eventKey);
        eventMap[favoriteFeedKey].push(new FeedEvents(from, fetchTopic, ts, event, seqno));

        if (currentFeedEventKey == favoriteFeedKey){
          currentEventChanged = true;
        }
        changed = true ;
      }
    }

    console.log("---------------------------"+JSON.stringify(eventMap));

    if (changed) {
      this.storeService.set(PersistenceKey.eventList, eventList);
      this.storeService.set(PersistenceKey.eventMap,eventMap);
      
      this.storeService.set(PersistenceKey.favoriteFeedMap , favoriteFeedMap);
      eventBus.publish('feeds:favoriteFeedListChanged',this.getFavoriteFeeds());
    }

    if (currentEventChanged){
      eventBus.publish('feeds:eventListChanged',this.getFeedEvents(currentFeedEventKey));
    }

    // this.updateFavoriteFeedList();
      // params["since"] = Math.round(since.valueOf()/1000);
      // params["since"] = Math.round(since.valueOf()/1000);
    
  }

  updateEventList(feedEvent: FeedEvents, list: FeedEvents[]){
    for (let index = 0; index < list.length; index++) {
      if (list[index].nodeId == feedEvent.nodeId && 
          list[index].topic == feedEvent.topic &&
          list[index].seqno == feedEvent.seqno) {
            return ;
          }
    }
    list.push(feedEvent);
    this.storeService.set(PersistenceKey.eventList,list);
  }

  /*
  {
    "jsonrpc": "2.0",
    "method": "new_event",
    "params": {
      "topic": "topic名称(string)",
      "event": "事件内容(string)",
      "seqno": "序列号(number)",
      "ts": "时间戳(number)"
    }
  }
  */
  handleNewEventResult(nodeId: string, result: any){
    console.log("handleNewEventResult=>");
    let topic = result.topic;
    let event = result.event;
    let seqno = result.seqno;
    let ts = result.ts;

    // // let event = new FeedEvents(nodeId, result.topic, result.ts, result.event, result.seqno);
    // eventList.push(event);
    // this.storeService.set(PersistenceKey.eventList,eventList);
    let changed = false;
    let currentEventChanged = false;

    let eventKey = nodeId+topic+event;
    if (eventList.indexOf(eventKey) == -1){
      let favoriteFeedKey = nodeId+topic ;
      let unread = favoriteFeedMap[favoriteFeedKey].unread;
      favoriteFeedMap[favoriteFeedKey].lastSeqno = seqno;
      favoriteFeedMap[favoriteFeedKey].unread  = unread+1;
      favoriteFeedMap[favoriteFeedKey].lastReceived = ts;

      if (eventMap[favoriteFeedKey] == undefined){
        eventMap[favoriteFeedKey] = [];
      }
      eventList.push(eventKey);
      eventMap[favoriteFeedKey].push(new FeedEvents(nodeId, fetchTopic, ts, event, seqno));

      if (currentFeedEventKey == favoriteFeedKey){
        currentEventChanged = true;
      }
      changed = true ;
    }

    if (changed) {
      this.storeService.set(PersistenceKey.eventList, eventList);
      this.storeService.set(PersistenceKey.eventMap,eventMap);

      this.storeService.set(PersistenceKey.favoriteFeedMap , favoriteFeedMap);
      eventBus.publish('feeds:favoriteFeedListChanged',this.getFavoriteFeeds());
    }

    if(currentEventChanged){
      eventBus.publish('feeds:eventListChanged',this.getFeedEvents(currentFeedEventKey));
    }
  }

  getCurrentTime(): string{
    return new Date().getTime().toString();
  }

  // doListSubscribedTopics(serverList: Friend[]){
  //   for (let index = 0; index < serverList.length; index++) {
  //     const server = serverList[index];
  //     if (server.status == ConnState.connected) {
  //       this.listSubscribed(server.userId);
  //     }
  //   }
  // }

  // updateFavoriteFeedList(feed:FavoriteFeed , feedList:FavoriteFeed[]){
  //   if (feedList == null){
  //     console.log("faverFeedList = null");
  //   }else{
  //     console.log("faverFeedList = "+JSON.stringify(feedList));
  //   }
  //   let isContain = false;
  //   for (let index = 0; index < feedList.length; index++) {
  //     const element = feedList[index];
  //     if (feedList[index].name == feed.name) {
  //       isContain = true;
  //       return;
  //     }
  //   }

  //   if (!isContain) {
  //     feedList.push(feed);
  //     this.storeService.set(PersistenceKey.faverFeedList,feedList);
  //   }
  // }

  // updateExploreFeedList(feed: FeedDescs , feedList: FeedDescs[]){
  //   let isContain = false;
  //   for (let index = 0; index < feedList.length; index++) {
  //     console.log("feed =>"+JSON.stringify(feed));
  //     console.log("faverFeedList =>"+JSON.stringify(faverFeedList));
  //     if (feedList[index].topic == feed.topic) {
  //       isContain = true;

  //       if(this.checkFollowState(feed.topic,faverFeedList)){
  //         feedList[index].followState = "following";
  //       }else{
  //         feedList[index].followState = "follow";
  //       }
  //       return;
  //     }
  //   }

  //   if (!isContain) {
  //     if(this.checkFollowState(feed.topic,faverFeedList)){
  //       feed.followState = "following";
  //     }else{
  //       feed.followState = "follow";
  //     }
  //     feedList.push(feed);
  //     this.storeService.set(PersistenceKey.exploreFeedList, feedList);
  //   }
  // }

  // checkFollowState(topic: string, faverFeedList:FavoriteFeed[]): boolean{
  //   let isFollowing = false;
  //   if (faverFeedList == null){
  //     return isFollowing;
  //   }

  //   for (let index = 0; index < faverFeedList.length; index++) {
  //     if (topic == faverFeedList[index].name){
  //       isFollowing = true;
  //       // feed.followState = "following";
  //     }
  //   }

  //   // if(!isFollowing){
  //   //   feed.followState = "follow";
  //   // }

  //   return isFollowing;
  // }

  checkFollowState(feedKey: string): string{
    if (favoriteFeedList == null){
      return "follow";
    }
    for (let index = 0; index < favoriteFeedList.length; index++) {
      if (feedKey == favoriteFeedList[index]){
        return "following"
      }
    }
    return "follow";
  }

  checkServerConnection(nodeId: string): boolean{
    if (serverMap[nodeId].status == ConnState.connected){
      return true;
    }
    return false;
    // for (let index = 0; index < serverList.length; index++) {
    //   if (serverList[index].userId == nodeId && serverList[index].status == ConnState.connected){
    //     return true;
    //   }
    // }
    // return false;
  }
}

//// Virtual data
let virtualServerList: string[] = [
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo",
  "3x4xVSJmtvty1tM8vzcz2pzW2WG7TmNavbnz9ka1EtZy",
]
let virtualServersMap: any = {
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo":new Friend('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo',
                                                            // 'edTfdBfDVXMvQfXMhEvKrbvxaDxGGURyRfxDVMhbdHZFgAcwmGtS',
                                                            'jerry@email.com',
                                                            'beijing', 
                                                            '',
                                                            ConnState.connected),
  "3x4xVSJmtvty1tM8vzcz2pzW2WG7TmNavbnz9ka1EtZy":new Friend('3x4xVSJmtvty1tM8vzcz2pzW2WG7TmNavbnz9ka1EtZy', 
                                                            // 'TvvfqqvetoPcrb6rkD5W3gNBxcWYQpqhqddqATVbbaMNcCCp4Hib',
                                                            'tom@email.com',
                                                            'shanghai',
                                                            'Tom', 
                                                            ConnState.disconnected)
}

let virtualFFList: string[] = [
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Carrier News',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Hive News',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Football',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Trinity News',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Hollywood Movies',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Cofee',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'MacBook',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Rust development',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Golang'
];

let virtualFFMap:any = {
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoCarrier News':
    new FavoriteFeed('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Carrier News', '', 24, 0),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoHive News':
    new FavoriteFeed('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Hive News',  '', 35, 0),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoFootball':
    new FavoriteFeed('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Football',  '', 4, 0),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoTrinity News':
    new FavoriteFeed('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Trinity News',  '', 0, 0, '12:00 Dec.12'),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoHollywood Movies':
    new FavoriteFeed('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Hollywood Movies', '',  24, 0),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoCofee':
    new FavoriteFeed('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Cofee',  '', 35, 0),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoMacBook':
    new FavoriteFeed('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'MacBook',  '', 4, 0),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoRust development':
    new FavoriteFeed('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Rust development', '',  0, 0, '12:00 Desc.12'),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoGolang':
  new FavoriteFeed('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Golang',  '', 8, 0)
}

let virtualMyFeedList: string[]=[
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Carrier News',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Hive News',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Trinity News',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'DID News',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'DID SideChain News',
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo'+'Football News'
]

let virtrulMyFeeds = {
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoCarrier News':
    new MyFeed('paper', 'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Carrier News', '', '12:10 Dec. 12, 2019'),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoHive News':
    new MyFeed('paper', 'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Hive News', '', '12:10 Dec.12, 2019'),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoTrinity News':
    new MyFeed('paper', 'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Trinity News', '', '12:10 Dec.12, 2019'),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoDID News':
    new MyFeed('paper', 'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'DID News', '', '12:10 Dec.12, 2019'),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoDID SideChain News':
    new MyFeed('paper', 'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'DID SideChain News', '', '12:10 Dec.12, 2019'),
  'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoFootball News':
    new MyFeed('paper', 'J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo', 'Football News', '', '12:10 Dec.12, 2019')
}

let virtualAFList: string[] = [
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo"+"Carrier News",
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo"+"Hive News",
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo"+"Trinity News",
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo"+"DID News",
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo"+"DMA News",
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo"+"Football News"
]

let virtualAFMap: any = {
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoCarrier News":
    new AllFeed("J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo","page","Carrier News","","following"),
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoHive News":
    new AllFeed("J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo","page","Hive News","","following"),
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoTrinity News":
    new AllFeed("J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo","page","Trinity News","","following"),
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoDID News":
    new AllFeed("J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo","page","DID News","","follow"),
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoDMA News":
    new AllFeed("J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo","page","DMA News","","following"),
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoFootball News":
    new AllFeed("J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo","page","Football News","","follow")
}

let virtualEventList: string[] = virtualFFList;

let virtrulFeedEvents = [
  new FeedEvents('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo',
    'Carrier News',
    '12:00, December 10, 2019',
    `Elastos Trinity DApp Store is your one-stop shop for finding the latest dApps available inside the Elastos ecosystem.
    The key difference between the applications available here and what you will find in any other app store is
    Elastos' guarantee of 100% security and privacy. All Elastos applications are decentralized, thus giving you
    the freedom to use the web as you should without the worries of data theft and third parties monetizing your data`,
    1),
  new FeedEvents('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo',
    'Carrier News',
    '15:00, December 10, 2019',
    `Elastos Trinity DApp Store is your one-stop shop for finding the latest dApps available inside the Elastos ecosystem.
    The key difference between the applications available here and what you will find in any other app store is
    Elastos' guarantee of 100% security and privacy. All Elastos applications are decentralized, thus giving you
    the freedom to use the web as you should without the worries of data theft and third parties monetizing your data`,
    1),
  new FeedEvents('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo',
    'Carrier News',
    '15:00, December 12, 2019',
    `Elastos Trinity DApp Store is your one-stop shop for finding the latest dApps available inside the Elastos ecosystem.
    The key difference between the applications available here and what you will find in any other app store is
    Elastos' guarantee of 100% security and privacy. All Elastos applications are decentralized, thus giving you
    the freedom to use the web as you should without the worries of data theft and third parties monetizing your data`,
    1),
  new FeedEvents('J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2Mo',
    'Carrier News',
    '15:00, December 14, 2019',
    `Elastos Trinity DApp Store is your one-stop shop for finding the latest dApps available inside the Elastos ecosystem.
    The key difference between the applications available here and what you will find in any other app store is
    Elastos' guarantee of 100% security and privacy. All Elastos applications are decentralized, thus giving you
    the freedom to use the web as you should without the worries of data theft and third parties monetizing your data`,
    1),
];

let virtrulFeedIntro = new FeedIntro(
  `bb Keep close to Nature's heart... and break clear away, once in awhile,
  and climb a mountain or spend a week in the woods. Wash your spirit clean.`);

let virtualMyEvents = 
  [
    {
      timestamp: '12:00, December 10, 2019',
      message:
        `Elastos Trinity DApp Store is your one-stop shop for finding the latest dApps available inside the Elastos ecosystem.
        The key difference between the applications available here and what you will find in any other app store is
        Elastos' guarantee of 100% security and privacy. All Elastos applications are decentralized, thus giving you
        the freedom to use the web as you should without the worries of data theft and third parties monetizing your data`
    },
    {
      timestamp: '15:00, December 10, 2019',
      message:
        `Elastos Trinity DApp Store is your one-stop shop for finding the latest dApps available inside the Elastos ecosystem.
        The key difference between the applications available here and what you will find in any other app store is
        Elastos' guarantee of 100% security and privacy. All Elastos applications are decentralized, thus giving you
        the freedom to use the web as you should without the worries of data theft and third parties monetizing your data`
    },
    {
      timestamp: '15:00, December 12, 2019',
      message:
        `Elastos Trinity DApp Store is your one-stop shop for finding the latest dApps available inside the Elastos ecosystem.
        The key difference between the applications available here and what you will find in any other app store is
        Elastos' guarantee of 100% security and privacy. All Elastos applications are decentralized, thus giving you
        the freedom to use the web as you should without the worries of data theft and third parties monetizing your data`
    },
    {
      timestamp: '15:00, December 14, 2019',
      message:
        `Elastos Trinity DApp Store is your one-stop shop for finding the latest dApps available inside the Elastos ecosystem.
        The key difference between the applications available here and what you will find in any other app store is
        Elastos' guarantee of 100% security and privacy. All Elastos applications are decentralized, thus giving you
        the freedom to use the web as you should without the worries of data theft and third parties monetizing your data`
    }
  ];

let virtualMyEventMap = {
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoCarrier News":virtualMyEvents,
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoHive News":virtualMyEvents,
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoTrinity News":virtualMyEvents,
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoDID News":virtualMyEvents,
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoDID SideChain News":virtualMyEvents,
  "J7xW32cH52WBfdYZ9Wgtghzc7DbbHSuvvxgmy2Nqa2MoFootball News":virtualMyEvents
}