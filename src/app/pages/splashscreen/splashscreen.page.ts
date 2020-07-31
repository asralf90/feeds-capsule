import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from "@ngx-translate/core";
import { ThemeService } from 'src/app/services/theme.service';
import { AppService } from '../../services/AppService';
declare let appManager: AppManagerPlugin.AppManager;
declare let titleBarManager: TitleBarPlugin.TitleBarManager;
@Component({
  selector: 'app-splashscreen',
  templateUrl: './splashscreen.page.html',
  styleUrls: ['./splashscreen.page.scss'],
})
export class SplashscreenPage implements OnInit {

  constructor(
    private modalCtrl: ModalController,
    private translate:TranslateService,
    private appService: AppService,
    public theme:ThemeService) { }

  ngOnInit() {

  }

  ionViewWillEnter() {
    titleBarManager.setTitle(this.translate.instant('common.feeds'));
  }

  ionViewDidEnter() {
    appManager.setVisible('show');
    this.hanldSplashEnd();
  }

  hanldSplashEnd(){
    let sid = setTimeout(() => {
     clearTimeout(sid);
     this.modalCtrl.dismiss();
     this.appService.init();
     this.appService.addright();
     this.appService.initializeApp();
   }, 1500);
 }

}
