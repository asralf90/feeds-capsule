import { Injectable } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { TranslateService} from '@ngx-translate/core';
import { FeedService } from './FeedService';
import { NativeService } from './NativeService';


@Injectable()
export class MenuService {

    optionsOn = false;
    nodeId: string = null;
    channelId: number = null;

    constructor(
        private feedService: FeedService,
        private actionSheetController: ActionSheetController,
        private translate: TranslateService,
        private native: NativeService
    ) {
    }

    showOptions(nodeId: string, channelId: number) {
        this.optionsOn = true;
        this.nodeId = nodeId;
        this.channelId = channelId;
    }

    hideOptions() {
        this.optionsOn = false;
        this.nodeId = null;
        this.channelId = null;
    }

    shareChannel() {
        this.native.toast("common.comingSoon");
        this.optionsOn = false;
    }

    deleteChannel() {
        if (this.feedService.getConnectionStatus() != 0) {
            this.native.toastWarn('common.connectionError');
        } else {
            this.feedService.unsubscribeChannel(this.nodeId, this.channelId);
        }
    
        this.optionsOn = false;
        this.nodeId = null;
        this.channelId = null;
    }

    async showChannelMenu(nodeId: string, channelId: number, channelName?: string){
        const actionSheet = await this.actionSheetController.create({
            mode: 'ios',
            buttons: [
            {
                text: this.translate.instant("common.share"),
                icon: 'share',
                handler: () => {
                    this.native.toast("common.comingSoon");
                }
            }, {
                text: this.translate.instant("common.unsubscribe"),
                role: 'destructive',
                icon: 'trash',
                handler: () => {
                    if(this.feedService.getConnectionStatus() != 0){
                        this.native.toastWarn('common.connectionError');
                        return;
                    }
                    
                    this.feedService.unsubscribeChannel(nodeId,channelId);
                }
            },{
                text: this.translate.instant("common.cancel"),
                icon: 'close',
                role: 'cancel',
                handler: () => {
                }
            }]
        });
        await actionSheet.present();
    }

    async showShareMenu(nodeId: string, channelId: number, channelName: string){
        const actionSheet = await this.actionSheetController.create({
            buttons: [
            {
                text: this.translate.instant("common.share"),
                icon: 'share',
                handler: () => {
                    this.native.toast("common.comingSoon");
                }
            },{
                text: this.translate.instant("common.cancel"),
                icon: 'close',
                role: 'cancel',
                handler: () => {
                }
            }]
        });
        await actionSheet.present();
    }

    async showUnsubscribeMenu(nodeId: string, channelId: number, channelName: string){
        const actionSheet = await this.actionSheetController.create({
            buttons: [{
              text: this.translate.instant("common.unsubscribe")+' @'+channelName,
              role: 'destructive',
              icon: 'trash',
              handler: () => {
                this.feedService.unsubscribeChannel(nodeId, channelId);
              }
            },{
              text: this.translate.instant("common.cancel"),
              icon: 'close',
              role: 'cancel',
              handler: () => {
              }
            }]
          });
        await actionSheet.present();
    }

    async showUnsubscribeMenuWithoutName(nodeId: string, channelId: number){
        const actionSheet = await this.actionSheetController.create({
            buttons: [{
              text: this.translate.instant("common.unsubscribe"),
              role: 'destructive',
              icon: 'trash',
              handler: () => {
                this.feedService.unsubscribeChannel(nodeId, channelId);
              }
            },{
              text: this.translate.instant("common.cancel"),
              icon: 'close',
              role: 'cancel',
              handler: () => {
              }
            }]
          });
        await actionSheet.present();
    }
}
