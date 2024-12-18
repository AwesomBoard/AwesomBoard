/* eslint-disable max-lines-per-function */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NextGameLoadingComponent } from './next-game-loading.component';

describe('NextGameLoadingComponent', () => {
    let component: NextGameLoadingComponent;
    let fixture: ComponentFixture<NextGameLoadingComponent>;

    beforeEach(async() => {
        await TestBed.configureTestingModule({
            declarations: [
                NextGameLoadingComponent,
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(NextGameLoadingComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });

});
