import { Component, OnInit,NgZone } from '@angular/core';
import { TranslateService } from "@ngx-translate/core";
import { Events} from '@ionic/angular';
import { ThemeService } from 'src/app/services/theme.service';
import { FeedService } from 'src/app/services/FeedService';
import { ActivatedRoute } from '@angular/router';
import { NativeService } from 'src/app/services/NativeService';
import * as _ from 'lodash';
declare let titleBarManager: TitleBarPlugin.TitleBarManager;
declare let appManager: AppManagerPlugin.AppManager;
@Component({
  selector: 'app-editserverinfo',
  templateUrl: './editserverinfo.page.html',
  styleUrls: ['./editserverinfo.page.scss'],
})
export class EditserverinfoPage implements OnInit {
  public connectionStatus = 1;
  public address:string = "";
  public name:string = "";
  public introduction:string = "";
  public elaAddress: string = "";
  public nodeId: string = "";
  public did: string = "";
  constructor(
    private feedService: FeedService,
    public activatedRoute:ActivatedRoute,
    public theme:ThemeService,
    private translate:TranslateService,
    private events: Events,
    private native: NativeService,
    private zone:NgZone
    ){ 

    }

  ngOnInit() {
    this.activatedRoute.queryParams.subscribe((data) => {
      let item = _.cloneDeep(data);
      this.address = item ["address"] || "";
      this.name = item["name"] || "";
      this.introduction = item["introduction"] || "";
      this.elaAddress =  item["elaAddress"] || "";
      this.nodeId = item["nodeId"] || "";
      this.did = item["did"] || "";
    });
  }

  ionViewWillEnter() {
    this.connectionStatus = this.feedService.getConnectionStatus();
    this.events.subscribe('feeds:connectionChanged',(status)=>{
      this.zone.run(() => {
        this.connectionStatus = status;
      });
    });
    this.events.subscribe("feeds:updateTitle",()=>{
      this.initTitle();
    });

    this.events.subscribe('feeds:bindServerFinish',()=>{
      this.zone.run(() => {
        this.native.hideLoading();
        this.native.pop();
      });
  });
  }

  ionViewDidEnter(){
    this.initTitle();
    this.native.setTitleBarBackKeyShown(true);
  }

  ionViewWillLeave(){
    this.native.hideLoading();
    this.events.unsubscribe("feeds:updateTitle");
    this.events.unsubscribe("feeds:connectionChanged");
    this.events.unsubscribe("feeds:bindServerFinish");
  }

  initTitle(){
    titleBarManager.setTitle(this.translate.instant('EditserverinfoPage.title'));
  }

  clickScan(){
    appManager.sendIntent('scanqrcode', {}, {}, (res) => {
      this.zone.run(()=>{
        this.elaAddress = res.result.scannedContent;
      });
    }, (err: any) => {
      console.error(err);
    });
  }

  cancel(){
    this.native.pop();
  }

  confirm(){
    if(this.feedService.getConnectionStatus() != 0){
      this.native.toastWarn('common.connectionError');
      return;
    }
    
    if(this.feedService.getServerStatusFromId(this.nodeId) != 0){
      this.native.toastWarn('common.connectionError');
      return;
    }

    if(this.checkParms()){
        this.native.showLoading('common.waitMoment');
        this.feedService.issueCredential(this.nodeId,this.did, this.name, this.introduction,this.elaAddress,()=>{
        },()=>{
          this.native.hideLoading();
        });
    }
  }

  checkParms(){
    if(this.name === ""){
       this.native.toast_trans('IssuecredentialPage.serverName');
       return false;
    }

    if(this.introduction === ""){
      this.native.toast_trans('IssuecredentialPage.serverDes');
      return false;
    }

    if(this.elaAddress === ""){
      this.native.toast_trans('IssuecredentialPage.elaaddress');
      return false;
   }
    return true;
  }
}