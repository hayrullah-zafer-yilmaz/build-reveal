# Angular

Angular uses the [`<build-reveal>` element](web-component.md).

## 1. Register the element

In `main.ts`, before the app starts:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { defineBuildRevealElement } from 'build-reveal/element';
import { AppComponent } from './app/app.component';

defineBuildRevealElement();
bootstrapApplication(AppComponent);
```

It does nothing on the server, so it's safe with server-side rendering.

## 2. Use it in a component

Add `CUSTOM_ELEMENTS_SCHEMA` to each component that uses `<build-reveal>` (or to its NgModule):

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <build-reveal [speed]="1.2" (complete)="onDone()">
      <h1 data-build="type">Revenue</h1>
      <p data-build>Up 12% this month.</p>
    </build-reveal>
  `
})
export class DashboardComponent {
  onDone() {
    console.log('revealed');
  }
}
```

## Options

Bind options as properties: `[cursors]`, `[speed]`, `[trigger]`, `[progressive]`, `[hold]`, `[disabled]`. A list of cursors works too:

```ts
import type { BuildCursor } from 'build-reveal';

export class DashboardComponent {
  cursors: BuildCursor[] = [{ label: 'Ada' }, { label: 'Linus' }];
  loading = true;
}
```

```html
<build-reveal [cursors]="cursors" [hold]="loading">…</build-reveal>
```

## Replay and finish

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild } from '@angular/core';
import type { BuildRevealElement } from 'build-reveal/element';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <button type="button" (click)="replay()">Replay</button>
    <build-reveal #reveal>
      <h1 data-build="type">Revenue</h1>
    </build-reveal>
  `
})
export class DashboardComponent {
  @ViewChild('reveal') reveal!: ElementRef<BuildRevealElement>;

  replay() {
    this.reveal.nativeElement.play();
  }
}
```

## Content

Content projected with `<ng-content>`, rendered with `@for` or `*ngFor`, or added after data loads is picked up while the animation is waiting or playing. Use `[hold]` to wait for data.

## Server-side rendering

The server HTML shows the content, and the targets are hidden when the element is upgraded in the browser. Content at the very top of the page may be visible for a moment before the animation starts; content further down isn't affected.
