import { Component, OnInit, NgZone } from '@angular/core';
import { CameraService } from 'src/app/services/CameraService';
import { NavController, Events } from '@ionic/angular';
import { NativeService } from 'src/app/services/NativeService';
import { TranslateService } from "@ngx-translate/core";
import { ThemeService } from '../../../services/theme.service';
import { FeedService } from 'src/app/services/FeedService';
declare let titleBarManager: TitleBarPlugin.TitleBarManager;

@Component({
  selector: 'app-profileimage',
  templateUrl: './profileimage.page.html',
  styleUrls: ['./profileimage.page.scss'],
})
export class ProfileimagePage implements OnInit {

  public connectionStatus = 1;

  public userAvatar: string = null;
  public hasAvatar = false;

  public select = 1;
  public selectedAvatar: string = null;

  public avatars = [
    {
      index: 1,
      image: 'assets/images/profile-1.svg',
    },
    {
      index: 2,
      image: 'assets/images/profile-2.svg',
    },
    {
      index: 3,
      image: 'assets/images/profile-3.svg',
    },
    {
      index: 4,
      image: 'assets/images/profile-4.svg',
    },
    {
      index: 5,
      image: 'assets/images/profile-5.svg',
    },
    {
      index: 6,
      image: 'assets/images/profile-6.svg',
    },
    {
      index: 7,
      image: 'assets/images/profile-7.svg',
    },
    {
      index: 8,
      image: 'assets/images/profile-8.svg',
    },
    {
      index: 9,
      image: 'assets/images/profile-9.svg',
    },
  ];

  constructor(
    private native: NativeService,
    private navCtrl: NavController,
    private events: Events,
    private zone: NgZone,
    private translate: TranslateService,
    private theme: ThemeService, 
    private feedService:FeedService,
    private camera: CameraService
  ) { }

  ngOnInit() {
    
  }

  ionViewWillEnter() {
    this.select = this.feedService.getSelsectIndex();
    this.selectedAvatar = this.feedService.getProfileIamge() || 'assets/images/profile-1.svg';
      
    if(this.selectedAvatar.indexOf("data:image") === -1) {;
      this.hasAvatar = false;
    } else {
      this.userAvatar = this.selectedAvatar;
      this.hasAvatar = true;
    }
   
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

  ionViewWillLeave(){
    this.camera = null;
    this.events.unsubscribe("feeds:connectionChanged");
    this.events.unsubscribe("feeds:updateTitle"); 
  }

  ionViewDidEnter() {
    this.initTitle();
    this.native.setTitleBarBackKeyShown(true);
  }

  initTitle(){
    titleBarManager.setTitle(this.translate.instant("ProfileimagePage.title"));
  }

  selectIndex(index: number, avatar?: string){
    this.select = index;
    if (index === 0){
      this.openCamera(0);
      return;
    } else {
      this.selectedAvatar = "img://"+avatar;
    }
  }

  confirm(){
    if(!this.selectedAvatar) {
      this.native.toast_trans('common.noImageSelected');
      return false;
    } else {
      this.feedService.setSelsectIndex(this.select);
      this.feedService.setProfileIamge(this.selectedAvatar);
      this.navCtrl.pop();
    }
  }

  addPic(){
    this.openCamera(0);
  }

  openCamera(type: number){
    this.camera.openCamera(30,0,type,
      (imageUrl) => {
        this.zone.run(() => {
          this.userAvatar = imageUrl;
          this.selectedAvatar = imageUrl;
          this.hasAvatar = true;
        });
      }, (err) => {
        this.native.toast_trans('common.noImageSelected');

        // If err, use default avatar 
        this.select = 1;
        this.selectedAvatar = "img://"+"assets/images/profile-1.svg";
      }
    );
  }

}
