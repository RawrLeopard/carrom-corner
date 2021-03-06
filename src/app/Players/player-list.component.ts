import { Component, OnInit } from '@angular/core';
import { PlayerService } from '../Services/player.service';
import { Observable } from 'rxjs/Observable';
import { HttpClient } from '@angular/common/http';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';
import {GameService} from '../Services/game.service';
import {TeamService} from '../Services/team.service';
import {concatMap} from 'rxjs/operators';
import {tap} from 'rxjs/operators';
import {forkJoin} from 'rxjs/observable/forkJoin';

@Component({
  selector: 'app-players',
  templateUrl: './player-list.component.html',
})


export class PlayerListComponent implements OnInit {

  public players = [];
  public loading = true;
  public statChoice = 'total';

  constructor(private _playerService: PlayerService, private http: HttpClient, public _gameService: GameService,
              public _teamService: TeamService) {}

  // gets player list for list view
  ngOnInit() {
    this._playerService.getPlayers(true).subscribe((players) => {
      this.players = players;
      this.players.length < 1 ?
        this.loading = false
        : this.calculatePlayerStats();
    });
  }

  // calls the delete function from the player service, refreshes the player list
  delete(e, player) {
    e.preventDefault();
    this.players = [];
    this._playerService.deletePlayer(player).do(() => {
      this._playerService.getPlayers(true).subscribe((players) => {
        this.players = players;
      });
    }).subscribe();
  }

  changeStatFilter(filter) {
    this.statChoice = filter;
    this.sortPlayers(filter);
  }

  // Sorts players by an average of their singles and doubles elo
  sortPlayers(filter: string) {
    if (filter === 'singles') {
      this.sortBySinglesStats(this.players);
    } else if (filter === 'doubles') {
      this.sortByDoublesStats(this.players);
    } else {
      this.sortByTotalStats(this.players);
    }
    this.loading = false;
  }

  sortBySinglesStats(pool) {
    pool.sort((a, b) => {
        if (a.singlesWinPtg !== undefined && b.singlesWinPtg === undefined) { return -1; }
        if (a.singlesWinPtg > b.singlesWinPtg) { return -1; }
        if (b.singlesWinPtg > a.singlesWinPtg) { return 1; }
        if (a.singlesWins > b.singlesWins) { return -1; }
        if (b.singlesWins > a.singlesWins) { return 1; }
        if (a.singlesAvgDiff > b.singlesAvgDiff) { return -1; }
        if (b.singlesAvgDiff > a.singlesAvgDiff) { return 1; }
        return a.singlesAvgDiff >= b.singlesAvgDiff ? -1 : 1;
      }
    );
  }

  sortByDoublesStats(pool) {
    pool.sort((a, b) => {
        if (a.doublesWinPtg !== undefined && b.doublesWinPtg === undefined) { return -1; }
        if (a.doublesWinPtg > b.doublesWinPtg) { return -1; }
        if (b.doublesWinPtg > a.doublesWinPtg) { return 1; }
        if (a.doublesWins > b.doublesWins) { return -1; }
        if (b.doublesWins > a.doublesWins) { return 1; }
        if (a.doublesAvgDiff > b.doublesAvgDiff) { return -1; }
        if (b.doublesAvgDiff > a.doublesAvgDiff) { return 1; }
        return a.doublesAvgDiff >= b.doublesAvgDiff ? -1 : 1;
      }
    );
  }

  sortByTotalStats(pool) {
    pool.sort((a, b) => {
        if (a.totalWinPtg !== undefined && b.totalWinPtg === undefined) { return -1; }
        if (a.totalWinPtg > b.totalWinPtg) { return -1; }
        if (b.totalWinPtg > a.totalWinPtg) { return 1; }
        if (a.totalWins > b.totalWins) { return -1; }
        if (b.totalWins > a.totalWins) { return 1; }
        if (a.totalAvgDiff > b.totalAvgDiff) { return -1; }
        if (b.totalAvgDiff > a.totalAvgDiff) { return 1; }
        return a.totalAvgDiff >= b.totalAvgDiff ? -1 : 1;
      }
    );
  }

  calculatePlayerStats() {
    const playerStatFetches: Observable<Object>[] = [];
    for (const player of this.players) {
      const singlesDoublesObservables: Observable<Object>[] = [];
      singlesDoublesObservables.push(this.fetchCalculatedSinglesStats(player));
      singlesDoublesObservables.push(this.fetchCalculatedDoublesStats(player));
      playerStatFetches.push(forkJoin(singlesDoublesObservables));
    }
    forkJoin(...playerStatFetches).subscribe(() => {
      for (const player of this.players) {
        player.totalWins = player.singlesWins + player.doublesWins;
        player.totalLosses = player.singlesLosses + player.doublesLosses;
        player.totalWinPtg = this.setTotalWinPtg(player.totalWins, player.totalLosses);
        player.totalAvgDiff = this.setTotalAvgDiff(player.totalSinglesDiff, player.totalDoublesDiff, player.totalWins, player.totalLosses);
      }
      this.sortPlayers('total');
    });
  }

  setTotalWinPtg(totalWins, totalLosses) {
    return totalWins + totalLosses === 0 ? undefined : totalWins / (totalWins + totalLosses);
  }

  setTotalAvgDiff(singlesDiff, doublesDiff, wins, losses) {
    if (!(typeof singlesDiff === 'number') && !(typeof doublesDiff === 'number')) { return undefined; }
    if (!(typeof singlesDiff === 'number') && typeof doublesDiff === 'number') { return doublesDiff / (wins + losses); }
    if (typeof singlesDiff === 'number' && !(typeof doublesDiff === 'number')) { return singlesDiff / (wins + losses); }
    return (singlesDiff + doublesDiff) / (wins + losses);
  }

  fetchCalculatedSinglesStats(player): Observable<any> {
    player.singlesWins = 0;
    player.singlesLosses = 0;
    return this._gameService.getPlayerSinglesWinsAndLosses(player.id).pipe(tap((result) => {
      if (result[0].win_count > 0) {  player.singlesWins = result[0].win_count; }
      if (result[0].loss_count > 0) { player.singlesLosses = result[0].loss_count; }
      player.singlesWinPtg = (player.singlesWins + player.singlesLosses) > 0 ?
        player.singlesWins / (player.singlesWins + player.singlesLosses)
        : undefined;
      player.totalSinglesDiff = result[0].plus + result[0].minus;
      player.singlesAvgDiff = (player.singlesWins + player.singlesLosses) > 0 ?
        ((result[0].plus + result[0].minus) / (player.singlesWins + player.singlesLosses))
        : undefined;
    }));
  }

  fetchCalculatedDoublesStats(player): Observable<any> {
    return this._teamService.getPlayerTeams(player.id).pipe(concatMap((teams) => {
      player.doublesWins = 0;
      player.doublesLosses = 0;
      player.doublesWinPtg = undefined;
      player.doublesAvgDiff = undefined;
      const observablesArray: Observable<Object>[] = [];
      for (const team of teams) {
        observablesArray.push(this._gameService.getPlayerDoublesWinsAndLosses(team.id));
      }
      return observablesArray.length === 0
      ? Observable.of([]) // if the player is new or was not in any doubles tournaments, we don't want to forkjoin an empty observable
      : forkJoin(...observablesArray).pipe(tap((teamRecords) => {
        let totalPlus = 0, totalMinus = 0;
        for (const record of teamRecords) {
          player.doublesWins += record[0].win_count;
          player.doublesLosses += record[0].loss_count;
          totalPlus += record[0].plus;
          totalMinus += record[0].minus;
        }
        player.totalDoublesDiff = totalPlus + totalMinus;
        player.doublesWinPtg = (player.doublesWins + player.doublesLosses) > 0
          ? player.doublesWins / (player.doublesWins + player.doublesLosses)
          : undefined;
        player.doublesAvgDiff = (player.doublesWins + player.doublesLosses) > 0
          ? ((totalPlus + totalMinus) / (player.doublesWins + player.doublesLosses))
          : undefined;
      }));
    }));
  }
}
