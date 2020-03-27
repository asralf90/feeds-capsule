import { Component, OnInit, NgZone } from '@angular/core';
import { NavController, Events } from '@ionic/angular';
import { FeedService } from 'src/app/services/FeedService';
import { PopupProvider } from 'src/app/services/popup';
import { NativeService } from 'src/app/services/NativeService';

@Component({
  selector: 'page-create-feed',
  templateUrl: './create-feed.html',
  styleUrls: ['./create-feed.scss'],
})
export class CreateFeedPage implements OnInit {
  private connectStatus = 1;
  private serverList: any;
  constructor(
    private navCtrl: NavController,
    private feedService: FeedService,
    private zone: NgZone,
    private events: Events,
    private popup: PopupProvider,
    private native: NativeService) {
      this.connectStatus = this.feedService.getConnectionStatus();
      this.serverList = feedService.getServerList();
      this.events.subscribe('feeds:createTopicSuccess', () => {
        this.navigateBack();
        this.native.toast("Create topic success!");
      });
      this.events.subscribe('feeds:connectionChanged', connectionStatus => {
        this.zone.run(() => {
            this.connectStatus = connectionStatus;
        });
    });
  }

  ngOnInit() {
  }

  createTopic(name: HTMLInputElement, desc: HTMLInputElement, select: HTMLInputElement){
    if (select.value=="" || name.value=="" || desc.value == ""){
      alert("Invalid params");
      return ;
    }

    this.popup.ionicConfirm("Prompt","Confirm new topic?<br>"+"server:"+select.value+"<br>"+"topic:"+name.value+"<br>"+"description:"+desc.value,
                            "ok","cancel").then((data)=>{
                              if (data) {
                                
                                this.feedService.createTopic(select.value, name.value, desc.value);
                              }
                            });
    
  }

  navigateBack() {
    this.navCtrl.pop();
  }

  
}
