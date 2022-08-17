import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Fetchers } from 'src/fetcher';

@Component({
  selector: 'app-add-service-dialog',
  templateUrl: './add-service-dialog.component.html',
  styleUrls: ['./add-service-dialog.component.scss'],
})
export class AddServiceDialogComponent implements OnInit {
  availableFetchers: {
    serviceName: string;
    key: string;
    fetcherClass: any;
  }[] = [];

  constructor(
    public dialogRef: MatDialogRef<AddServiceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.availableFetchers = Object.keys(Fetchers).map((key) => {
      return {
        serviceName: (Fetchers[key] as any).getName(),
        key: key,
        fetcherClass: Fetchers[key],
      };
    });
  }

  save(fetcherKey: string): void {
    this.dialogRef.close({
      fetcherKey,
    });
  }
}
