import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {UserDAO} from '../dao/UserDAO';
import {IUser, IUserId} from '../domain/iuser';
import {Router} from '@angular/router';
import {ActivesUsersService} from './ActivesUsersService';
// import {current} from 'codelyzer/util/syntaxKind';

@Injectable({
	providedIn: 'root'
})
export class UserService {
	// TODO : token en sessionStorage, voir martiastrid
	private userName = this.getUserNameBS();
	private userDocId = new BehaviorSubject<string>('');

	userNameObs = this.userName.asObservable();

	private unsubscribe: () => void;

	constructor(private _route: Router,
				private activesUsersService: ActivesUsersService,
				private userDao: UserDAO) {
	}

	getCurrentUser(): string {
		return this.userName.getValue();
	}

	private changeUser(username: string, userDocId: string, password: string) {
		sessionStorage.setItem('currentUser', JSON.stringify({user: username, pw: password}));
		this.userName.next(username);
		this.userDocId.next(userDocId);
	}

	// on all pages (header then)

	updateUserActivity(activityIsAMove: boolean) {
		const currentUserDocId = this.userDocId.getValue();
		if (currentUserDocId === '') {
			return;
		}
		this.userDao.updateUserDocActivity(currentUserDocId, activityIsAMove);
	}

	// On Server Component

	getActivesUsersObs(): Observable<IUserId[]> {
		// TODO: désabonnements aux autres services user
		this.activesUsersService.startObserving();
		return this.activesUsersService.activesUsersObs;
	}

	unSubFromActivesUsersObs() {
		this.activesUsersService.stopObserving();
	}

	// autres

	private getUserNameBS(): BehaviorSubject<string> {
		const currentUser: {'user': string; 'pw': string} = JSON.parse(sessionStorage.getItem('currentUser'));
		if (currentUser != null) {
			console.log('trying to log ' + JSON.stringify(currentUser));
			this.logAsHalfMember(currentUser.user, currentUser.pw);
		}
		return new BehaviorSubject<string>('');
	}

	logAsHalfMember(pseudo: string, code: string) {
		/* si on trouve l'utilisateur
			 *	  -> si le code match
			 *	  		-> on connecte
			 *	  		-> on lui dit que c'est prit ou mauvais code
			 *	  -> sinon on crée l'user et le connecte
			 */
		this.unsubscribe = this.userDao.observeUserByPseudo(pseudo, foundUser => {
			if (foundUser === undefined) {
				this.onNewUser(pseudo, code);
			} else {
				this.onFoundUser(pseudo, code, foundUser);
			}
		});
	}

	private onNewUser(pseudo: string, code: string) {
		this.unsubscribe();
		this.createHalfMemberThenLog(pseudo, code);
	}

	private createHalfMemberThenLog(pseudo: string, code: string) {
		const newUser: IUser = {
			code: code,
			pseudo: pseudo,
			email: '',
			inscriptionDate: Date.now(),
			lastActionTime: Date.now(),
			status: -1
		};
		this.userDao.createUser(newUser)
			.then(userId => this.logValidHalfMember(pseudo, code, userId));
	}

	private onFoundUser(pseudo: string, code: string, foundUser: IUserId) {
		this.unsubscribe();
		if (code === foundUser.user.code) {
			this.logValidHalfMember(foundUser.user.pseudo, foundUser.user.code, foundUser.id);
		} else {
			console.log('code incorrect !'); // TODO : rendre ça visible de l'user
		}
	}

	private logValidHalfMember(pseudo: string, code: string, id: string) {
		this.userDao.updateUserById(id, {
			lastActionTime: Date.now(),
			status: -2 // TODO calculate what that must be
		}).then(onfullfilled => {
			this.changeUser(pseudo, id, code);
			this._route.navigate(['/server']);
		});
	}

	// Delegate

	REFACTOR_observeUserByPseudo(pseudo: string, callback: (user: IUserId) => void): () => void {
		// the callback will be called on the foundUser
		return this.userDao.observeUserByPseudo(pseudo, callback);
	}

}
