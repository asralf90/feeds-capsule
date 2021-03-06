import { Component, OnInit, NgZone } from '@angular/core';
import { NavController, Events, PopoverController } from '@ionic/angular';
import { ServerlistcomponentComponent } from '../../../components/serverlistcomponent/serverlistcomponent.component';
import { FeedService } from 'src/app/services/FeedService';
import { NativeService } from 'src/app/services/NativeService';
import { ThemeService } from 'src/app/services/theme.service';
import { TranslateService } from "@ngx-translate/core";
import { TipdialogComponent} from '../../../components/tipdialog/tipdialog.component';
declare let titleBarManager: TitleBarPlugin.TitleBarManager;

@Component({
  selector: 'app-createnewfeed',
  templateUrl: './createnewfeed.page.html',
  styleUrls: ['./createnewfeed.page.scss'],
})
export class CreatenewfeedPage implements OnInit {

  public namelen = 0;
  public len = 0;
  public connectionStatus = 1;
  public channelAvatar = "";
  public avatar = "";
  public selectedServer: any = null;
  public selectedChannelSource:string = 'Select channel source';

  constructor(
    private popover: PopoverController ,
    private navCtrl: NavController,
    private feedService: FeedService,
    private popoverController: PopoverController,
    private zone: NgZone,
    private events: Events,
    private native: NativeService,
    public theme:ThemeService,
    private translate:TranslateService,
  ) {
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.initTitle();
    this.native.setTitleBarBackKeyShown(true);
    
    this.selectedServer = this.feedService.getBindingServer();
    this.selectedChannelSource = this.selectedServer.did;
    this.connectionStatus = this.feedService.getConnectionStatus();
    this.channelAvatar = this.feedService.getProfileIamge();
    this.avatar = this.feedService.parseChannelAvatar(this.channelAvatar);

    this.events.subscribe(FeedsEvent.PublishType.rpcRequestError, () => {
      this.zone.run(() => {
         this.native.hideLoading();
      });
    });
  
    this.events.subscribe(FeedsEvent.PublishType.rpcResponseError, () => {
      this.zone.run(() => {
        this.native.hideLoading();
      });
    });

    this.events.subscribe(FeedsEvent.PublishType.tipdialogCancel,()=>{
       this.popover.dismiss();
    });

    this.events.subscribe(FeedsEvent.PublishType.tipdialogConfirm, (name,des)=>{
       this.popover.dismiss();
       this.native.showLoading("common.waitMoment").then(()=>{
        this.feedService.createTopic(this.selectedServer.nodeId, name, des, this.channelAvatar);
       }).catch(()=>{
        this.native.hideLoading();
       });
      

    });
    this.events.subscribe(FeedsEvent.PublishType.connectionChanged,(status)=>{
      this.zone.run(() => {
        this.connectionStatus = status;
      });
    });
    this.events.subscribe(FeedsEvent.PublishType.createTopicSuccess, () => {
      this.zone.run(() => {
        this.native.hideLoading();
        this.navCtrl.pop().then(()=>{
          this.native.toast(this.translate.instant("CreatenewfeedPage.createfeedsuccess"));
        });
      });
    });

    this.events.subscribe(FeedsEvent.PublishType.updateTitle,()=>{
      this.initTitle();
    });

    this.feedService.checkBindingServerVersion(()=>{
      this.zone.run(() => {
        this.navCtrl.pop().then(()=>{
          this.feedService.hideAlertPopover();
        });
      });
    });
  }

  ionViewDidEnter() {
  }

  ionViewWillLeave(){
    this.events.unsubscribe(FeedsEvent.PublishType.tipdialogCancel);
    this.events.unsubscribe(FeedsEvent.PublishType.tipdialogConfirm);
    this.events.unsubscribe(FeedsEvent.PublishType.connectionChanged);
    this.events.unsubscribe(FeedsEvent.PublishType.createTopicSuccess);
    this.events.unsubscribe(FeedsEvent.PublishType.updateTitle);
    this.events.unsubscribe(FeedsEvent.PublishType.rpcRequestError);
    this.events.unsubscribe(FeedsEvent.PublishType.rpcResponseError);
    this.native.hideLoading();
  }

  initTitle(){
    titleBarManager.setTitle(this.translate.instant("CreatenewfeedPage.createNewFeed"));
  }

  async selectChannelSource(event){
    // alert("selectChannelSource");

    const popover = await this.popoverController.create({
      component: ServerlistcomponentComponent,
      componentProps: {serverList:this.feedService.getCreationServerList()},
      event:event,
      translucent: true
    });

    popover.onDidDismiss().then((result)=>{
      if(result.data == undefined){
        return;
      }

      this.zone.run(() => {
        this.selectedServer = result.data;

        this.selectedChannelSource = this.selectedServer.did;
      })

    });
    return await popover.present();
  }

  createChannel(name: HTMLInputElement, desc: HTMLInputElement){
    this.feedService.checkDIDOnSideChain(this.selectedServer.did,(isOnSideChain)=>{
      this.zone.run(() => {
        if (!isOnSideChain ){
          this.native.toastWarn('common.waitOnChain');
          return ;
        }
        this.processCreateChannel(name, desc);
      });
    });
  }

  processCreateChannel(name: HTMLInputElement, desc: HTMLInputElement){
    let nameValue = name.value || "";
        nameValue = this.native.iGetInnerText(nameValue);
    if (nameValue==""){
      this.native.toast_trans("CreatenewfeedPage.tipMsg1");
      return ;
    }

    if (name.value.length > 32){
      this.native.toast_trans("CreatenewfeedPage.tipMsgLength1");
      return ;
    }

    let descValue = desc.value || "";
        descValue = this.native.iGetInnerText(descValue);
    if (descValue == ""){
      this.native.toast_trans("CreatenewfeedPage.tipMsg2");
      return ;
    }

    if (desc.value.length > 128){
      this.native.toast_trans("CreatenewfeedPage.tipMsgLength");
      return ;
    }

    this.channelAvatar = this.feedService.getProfileIamge() || "";

    if (this.channelAvatar == ""){
      this.native.toast_trans("CreatenewfeedPage.tipMsg");
      return ;
    }

    this.avatar = this.feedService.parseChannelAvatar(this.channelAvatar);

    if (this.selectedServer == null){
      this.native.toast_trans("CreatenewfeedPage.tipMsg3");
      return ;
    }
    
    let checkRes = this.feedService.checkValueValid(name.value);
    if (checkRes){
      this.native.toast_trans("CreatenewfeedPage.nameContainInvalidChars");
      return ;
    }
    
    this.createDialog(name.value,desc.value);
  }

  profileimage(){
    this.native.navigateForward(['/profileimage'],"");
  }

  onChangeText(des){
    this.len = des.value.length;
  }

  onChangeName(name){
    this.namelen = name.value.length;
  }

  async createDialog(name:string,des:string){
    let popover = await this.popoverController.create({
      mode: 'ios',
      cssClass: 'genericPopup',
      component: TipdialogComponent,
      componentProps: {
        "did":this.selectedServer.did,
        "name":name,
        "des":des
      }
    });
    popover.onWillDismiss().then(() => {
        popover = null;
    });
    
    return await popover.present();
  }
}
