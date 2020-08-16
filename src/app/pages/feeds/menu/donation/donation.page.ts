import { Component, OnInit, NgZone } from '@angular/core';
import { PopoverController } from '@ionic/angular';
import { Events } from '@ionic/angular';
import { NativeService } from 'src/app/services/NativeService';
import { TranslateService } from "@ngx-translate/core";
import { FeedService } from 'src/app/services/FeedService';
import { ThemeService } from 'src/app/services/theme.service';
import { PaypromptComponent } from 'src/app/components/payprompt/payprompt.component'

declare let titleBarManager: TitleBarPlugin.TitleBarManager;

@Component({
  selector: 'app-donation',
  templateUrl: './donation.page.html',
  styleUrls: ['./donation.page.scss'],
})
export class DonationPage implements OnInit {
  private isShowPrompt: boolean = false;
  private connectionStatus = 1;
  private elaAddress = "EYWDcCyp6czaqAKGiq4b7exhWJfVpbG2D9";
  private popover:any;
  constructor(
    public theme:ThemeService,
    private popoverController:PopoverController,
    private zone: NgZone,
    private native: NativeService,
    private translate:TranslateService,
    private events: Events,
    private feedService:FeedService,
    ) {}

  ngOnInit() {
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
  
  }

  ionViewDidEnter(){
    this.initTitle();
    this.native.setTitleBarBackKeyShown(true);
  }

  initTitle(){
    titleBarManager.setTitle(this.translate.instant("DonationPage.donation"));
  }
  

  ionViewWillLeave(){
    this.events.unsubscribe("feeds:connectionChanged");
    this.events.unsubscribe("feeds:updateTitle");
  }

  donation(){
    this.showPayPrompt(this.elaAddress);
  }


  async showPayPrompt(elaAddress:string) {
    this.isShowPrompt = true;
    this.popover = await this.popoverController.create({
      mode: 'ios',
      cssClass: 'genericPopup',
      component: PaypromptComponent,
      componentProps: {
        "title": this.translate.instant("DonationPage.donation"),
        "elaAddress":elaAddress,
        "defalutMemo":"donation to feeds"
      }
    });
    this.popover.onWillDismiss().then(() => {
      this.isShowPrompt = false;
      this.popover = null;
    });
    return await this.popover.present();
  }

  clickAddress(){
    this.native.copyClipboard(this.elaAddress).then(()=>{
        this.native.toast_trans("common.copysucceeded");
    }).catch(()=>{

    });
  }
}